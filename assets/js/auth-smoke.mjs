#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_PATH = resolve(ROOT, "assets/js/config.js");

function usage() {
	return `Usage:
  node assets/js/auth-smoke.mjs [--email user@example.com --password secret] [--keep] [--json]

What it tests:
  1. Firebase email/password account create or sign-in
  2. Firebase email/password sign-in
  3. Backend bootstrap endpoint with the Firebase ID token
  4. Firestore app/probe write, read, and cleanup through the same user-scoped rules

Env alternatives:
  OURSTUFF_AUTH_EMAIL
  OURSTUFF_AUTH_PASSWORD

Default:
  Generates a disposable email/password and deletes the generated account after the smoke.`;
}

function parseArgs(argv) {
	const args = {
		email: process.env.OURSTUFF_AUTH_EMAIL || "",
		password: process.env.OURSTUFF_AUTH_PASSWORD || "",
		keep: false,
		json: false,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			args.help = true;
		} else if (arg === "--email") {
			args.email = argv[++index] || "";
		} else if (arg === "--password") {
			args.password = argv[++index] || "";
		} else if (arg === "--keep") {
			args.keep = true;
		} else if (arg === "--json") {
			args.json = true;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	return args;
}

async function loadConfig() {
	const source = await readFile(CONFIG_PATH, "utf8");
	const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
	return await import(moduleUrl);
}

function randomSuffix() {
	return crypto.randomBytes(8).toString("hex");
}

function generatedCredentials() {
	const suffix = `${Date.now()}-${randomSuffix()}`;
	return {
		email: `codex-auth-smoke-${suffix}@ourstuff.space.invalid`,
		password: `AuthSmoke-${randomSuffix()}-9a`,
		generated: true,
	};
}

async function jsonFetch(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			"content-type": "application/json",
			...(options.headers || {}),
		},
	});
	const text = await response.text();
	const json = text ? JSON.parse(text) : {};
	if (!response.ok) {
		const message =
			json?.error?.message ||
			json?.error?.status ||
			`${response.status} ${response.statusText}`;
		const error = new Error(message);
		error.status = response.status;
		error.body = json;
		throw error;
	}
	return json;
}

async function firebaseAuthRequest(config, route, body) {
	return await jsonFetch(
		`https://identitytoolkit.googleapis.com/v1/${route}?key=${encodeURIComponent(
			config.FIREBASE_CONFIG.apiKey,
		)}`,
		{
			method: "POST",
			body: JSON.stringify(body),
		},
	);
}

async function createAccount(config, email, password) {
	return await firebaseAuthRequest(config, "accounts:signUp", {
		email,
		password,
		returnSecureToken: true,
	});
}

async function signIn(config, email, password) {
	return await firebaseAuthRequest(config, "accounts:signInWithPassword", {
		email,
		password,
		returnSecureToken: true,
	});
}

async function deleteAccount(config, idToken) {
	return await firebaseAuthRequest(config, "accounts:delete", { idToken });
}

async function bootstrap(config, idToken) {
	return await jsonFetch(`${config.PAYMENTS_WORKER_URL}/api/bootstrap-user`, {
		method: "POST",
		headers: { authorization: `Bearer ${idToken}` },
		body: "{}",
	});
}

function firestoreBase(config) {
	return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
		config.FIREBASE_CONFIG.projectId,
	)}/databases/(default)/documents`;
}

function firestoreValue(value) {
	if (value === null || value === undefined) {
		return { nullValue: null };
	}
	if (typeof value === "boolean") {
		return { booleanValue: value };
	}
	if (Number.isInteger(value)) {
		return { integerValue: String(value) };
	}
	if (typeof value === "number") {
		return { doubleValue: value };
	}
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
			return { timestampValue: value };
		}
		return { stringValue: value };
	}
	if (Array.isArray(value)) {
		return { arrayValue: { values: value.map(firestoreValue) } };
	}
	if (typeof value === "object") {
		return { mapValue: { fields: firestoreFields(value) } };
	}
	throw new Error(`Cannot encode Firestore value: ${typeof value}`);
}

function firestoreFields(object) {
	return Object.fromEntries(
		Object.entries(object).map(([key, value]) => [key, firestoreValue(value)]),
	);
}

async function writeFirestoreDoc(config, idToken, path, data) {
	return await jsonFetch(`${firestoreBase(config)}/${path}`, {
		method: "PATCH",
		headers: { authorization: `Bearer ${idToken}` },
		body: JSON.stringify({ fields: firestoreFields(data) }),
	});
}

async function readFirestoreDoc(config, idToken, path) {
	return await jsonFetch(`${firestoreBase(config)}/${path}`, {
		method: "GET",
		headers: { authorization: `Bearer ${idToken}` },
	});
}

async function deleteFirestoreDoc(config, idToken, path) {
	return await jsonFetch(`${firestoreBase(config)}/${path}`, {
		method: "DELETE",
		headers: { authorization: `Bearer ${idToken}` },
	});
}

async function run() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		console.log(usage());
		return;
	}

	const config = await loadConfig();
	const generated = !args.email && !args.password;
	const credentials = generated
		? generatedCredentials()
		: { email: args.email, password: args.password, generated: false };
	if (!credentials.email || !credentials.password) {
		throw new Error("Provide both --email and --password, or provide neither to generate a disposable account.");
	}

	const runId = `auth-smoke-${Date.now()}-${randomSuffix()}`;
	const appId = config.APP_ID || "ourstuff-main";
	const steps = [];
	let createResult = null;
	let signInResult = null;
	let cleanupToken = "";

	try {
		if (generated) {
			createResult = await createAccount(config, credentials.email, credentials.password);
			cleanupToken = createResult.idToken;
			steps.push({ step: "create-account", ok: true, uid: createResult.localId });
		} else {
			steps.push({ step: "create-account", ok: true, skipped: true });
		}

		signInResult = await signIn(config, credentials.email, credentials.password);
		cleanupToken = signInResult.idToken;
		steps.push({ step: "sign-in", ok: true, uid: signInResult.localId });

		const bootstrapResult = await bootstrap(config, signInResult.idToken);
		steps.push({
			step: "bootstrap",
			ok: true,
			cloud: Boolean(bootstrapResult.cloud),
			admin: Boolean(bootstrapResult.admin),
			subscriptionStatus: bootstrapResult.subscriptionStatus || "",
		});

		const uid = signInResult.localId;
		const appPath = `users/${uid}/apps/${appId}`;
		const probePath = `${appPath}/artifacts/${runId}`;
		const now = new Date().toISOString();
		await writeFirestoreDoc(config, signInResult.idToken, appPath, {
			rootId: "ourstuff-root",
			storageVersion: 2,
			schemaVersion: 1,
			updatedAt: now,
			deviceId: runId,
			deleted: false,
			docCount: 1,
			artifactCount: 1,
			jsonBytes: 256,
		});
		steps.push({ step: "write-app-doc", ok: true, path: appPath });

		await writeFirestoreDoc(config, signInResult.idToken, probePath, {
			id: runId,
			type: "note",
			title: "Auth smoke probe",
			owner: uid,
			acl: { owners: [uid], editors: [], viewers: [] },
			visibility: "private",
			tags: ["ourstuff", appId, "auth-smoke"],
			status: "active",
			deleted: false,
			schemaVersion: 1,
			createdAt: now,
			updatedAt: now,
			refs: { assets: [], sources: [], links: [] },
			data: {
				core: { text: "CLI auth smoke probe", context: { appId } },
				ourstuff: { kind: "artifact", order: 0 },
			},
			extraAttributes: {
				extraAttribute1: "note",
				extraAttribute2: "auth-smoke",
				extraAttribute3: "",
				extraAttribute4: false,
				extraAttribute5: appId,
			},
		});
		steps.push({ step: "write-probe-doc", ok: true, path: probePath });

		const readResult = await readFirestoreDoc(config, signInResult.idToken, probePath);
		steps.push({
			step: "read-probe-doc",
			ok: true,
			name: readResult.name,
		});

		await deleteFirestoreDoc(config, signInResult.idToken, probePath);
		steps.push({ step: "delete-probe-doc", ok: true, path: probePath });

		if (generated && !args.keep) {
			await deleteFirestoreDoc(config, signInResult.idToken, appPath).catch((error) => {
				steps.push({ step: "delete-app-doc", ok: false, error: error.message });
			});
			await deleteAccount(config, cleanupToken);
			steps.push({ step: "delete-generated-account", ok: true });
		}

		const output = {
			ok: true,
			email: credentials.email,
			password: generated && args.keep ? credentials.password : undefined,
			generated,
			kept: Boolean(args.keep),
			uid: signInResult.localId,
			appId,
			steps,
		};
		if (args.json) {
			console.log(JSON.stringify(output, null, 2));
		} else {
			console.log(`PASS auth smoke uid=${output.uid} appId=${appId}`);
			console.log(`email=${credentials.email}`);
			if (generated && args.keep) {
				console.log(`password=${credentials.password}`);
			}
			for (const step of steps) {
				console.log(`${step.ok ? "PASS" : "FAIL"} ${step.step}${step.error ? ` ${step.error}` : ""}`);
			}
		}
	} catch (error) {
		const output = {
			ok: false,
			email: credentials.email,
			generated,
			uid: signInResult?.localId || createResult?.localId || "",
			error: error.message,
			status: error.status || null,
			steps,
		};
		if (args.json) {
			console.log(JSON.stringify(output, null, 2));
		} else {
			console.error(`FAIL auth smoke: ${error.message}`);
			for (const step of steps) {
				console.error(`${step.ok ? "PASS" : "FAIL"} ${step.step}${step.error ? ` ${step.error}` : ""}`);
			}
		}
		process.exitCode = 1;
	}
}

await run();
