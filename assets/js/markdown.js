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

export function renderMarkdown(raw) {
	const lines = String(raw ?? "").split("\n");
	let html = "";
	let inList = false;
	let listType = null;
	let inCode = false;
	let codeBuffer = [];

	function closeList() {
		if (!inList) return;
		html += `</${listType}>`;
		inList = false;
		listType = null;
	}

	function closeCode() {
		if (!inCode) return;
		html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
		codeBuffer = [];
		inCode = false;
	}

	lines.forEach((line) => {
		const trimmed = line.trim();

		if (trimmed.startsWith("```")) {
			if (inCode) closeCode();
			else {
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
