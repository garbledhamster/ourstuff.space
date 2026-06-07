export function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function imageHtml(alt, src) {
	const cleanAlt = String(alt || "");
	const cleanSrc = String(src || "").trim();
	if (/^ourstuff-asset:[a-z0-9-]+$/i.test(cleanSrc)) {
		return `<img data-local-asset="${cleanSrc.replace("ourstuff-asset:", "")}" alt="${cleanAlt}" loading="lazy">`;
	}
	if (/^pyxida-image:[a-z0-9._-]+$/i.test(cleanSrc)) {
		return `<img data-pyxdia-image="${cleanSrc.replace("pyxida-image:", "")}" alt="${cleanAlt}" loading="lazy">`;
	}
	if (/^https?:\/\/[^"'<>]+$/i.test(cleanSrc)) {
		return `<img src="${cleanSrc}" alt="${cleanAlt}" loading="lazy">`;
	}
	return escapeHtml(`![${alt}](${src})`);
}

function attachmentHtml(id, label = "Attachment") {
	const cleanId = String(id || "").trim();
	if (!/^file-[a-z0-9-]+$/i.test(cleanId) && !/^img-[a-z0-9-]+$/i.test(cleanId)) {
		return "";
	}
	const cleanLabel = String(label || "Attachment").trim() || "Attachment";
	return `<span class="ourstuff-attachment-pill-wrap"><a class="ourstuff-attachment-pill" href="#" data-local-file-link="${escapeHtml(cleanId)}" data-local-file-pill="true" target="_blank" rel="noopener noreferrer" aria-label="Open attachment ${escapeHtml(cleanLabel)}"><span class="ourstuff-attachment-icon" aria-hidden="true">FILE</span><span data-local-file-label>${escapeHtml(cleanLabel)}</span></a><button class="ourstuff-attachment-rename" data-action="rename-library-file" data-id="${escapeHtml(cleanId)}" type="button" aria-label="Rename attachment ${escapeHtml(cleanLabel)}">Rename</button></span>`;
}

function renderInlineMarkdown(text) {
	let output = escapeHtml(text);
	output = output.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
		imageHtml(alt, src),
	);
	output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
	output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
	output = output.replace(
		/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
	);
	return output;
}

function commandArgumentValue(value) {
	const text = String(value || "").trim();
	const first = text[0];
	const last = text[text.length - 1];
	if (
		text.length >= 2 &&
		((first === '"' && last === '"') || (first === "'" && last === "'"))
	) {
		return text.slice(1, -1).replaceAll(`\\${first}`, first).trim();
	}
	return text;
}

export function parseOurstuffLineCommand(line) {
	const text = String(line || "").trim();
	const match = /^:([a-z][a-z0-9_-]*)(?:\s+(.*))?$/i.exec(text);
	if (!match) {
		return null;
	}
	const name = match[1].toLowerCase();
	const value = commandArgumentValue(match[2] || "");
	if (name === "caption") {
		return value ? { name, value } : null;
	}
	if (name === "attachment") {
		const asset = /^ourstuff-asset:([a-z0-9-]+)$/i.exec(value);
		if (!asset) {
			return null;
		}
		return { name, value, id: asset[1] };
	}
	return null;
}

export function renderMarkdown(raw) {
	const lines = String(raw ?? "").split("\n");
	let html = "";
	let inList = false;
	let listType = null;
	let inCode = false;
	let codeBuffer = [];

	function closeList() {
		if (!inList) {
			return;
		}
		html += `</${listType}>`;
		inList = false;
		listType = null;
	}

	function closeCode() {
		if (!inCode) {
			return;
		}
		html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
		codeBuffer = [];
		inCode = false;
	}

	lines.forEach((line) => {
		const trimmed = line.trim();

		if (trimmed.startsWith("```")) {
			if (inCode) {
				closeCode();
			} else {
				closeList();
				inCode = true;
				codeBuffer = [];
			}
			return;
		}

		if (inCode) {
			codeBuffer.push(line);
			return;
		}

		if (!trimmed) {
			closeList();
			return;
		}

		if (trimmed.startsWith("### ")) {
			closeList();
			html += `<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`;
			return;
		}

		if (trimmed.startsWith("## ")) {
			closeList();
			html += `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
			return;
		}

		if (trimmed.startsWith("# ")) {
			closeList();
			html += `<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`;
			return;
		}

		if (trimmed.startsWith("> ")) {
			closeList();
			html += `<blockquote>${renderInlineMarkdown(trimmed.slice(2))}</blockquote>`;
			return;
		}

		const command = parseOurstuffLineCommand(trimmed);
		if (command?.name === "caption") {
			closeList();
			html += `<div class="ourstuff-command ourstuff-command--caption"><p>${renderInlineMarkdown(command.value)}</p></div>`;
			return;
		}
		if (command?.name === "attachment") {
			closeList();
			html += `<div class="ourstuff-command ourstuff-command--attachment">${attachmentHtml(command.id)}</div>`;
			return;
		}

		if (/^\d+\.\s+/.test(trimmed)) {
			if (!inList || listType !== "ol") {
				closeList();
				html += "<ol>";
				inList = true;
				listType = "ol";
			}
			html += `<li>${renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""))}</li>`;
			return;
		}

		if (/^[-*]\s+/.test(trimmed)) {
			if (!inList || listType !== "ul") {
				closeList();
				html += "<ul>";
				inList = true;
				listType = "ul";
			}
			html += `<li>${renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}</li>`;
			return;
		}

		closeList();
		html += `<p>${renderInlineMarkdown(trimmed)}</p>`;
	});

	closeList();
	closeCode();
	return html;
}
