import { escapeHtml, renderMarkdown } from "./markdown.js";

export function readerBodyHtml(title, body, emptyText = "No note text yet.") {
	const text = stripDuplicateTitleLine(title, body || "");
	return text
		? renderMarkdown(text)
		: emptyText
			? `<p>${escapeHtml(emptyText)}</p>`
			: "";
}

function nonEmptyPageLines(body) {
	return String(body || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

export function inferPageDisplayMode({ title, body }) {
	const hasTitle = String(title || "").trim().length > 0;
	const lineCount = nonEmptyPageLines(body).length;
	if (hasTitle && lineCount > 1) {
		return "normal";
	}
	if (hasTitle && lineCount === 0) {
		return "part";
	}
	if (hasTitle && lineCount === 1) {
		return "chapter";
	}
	if (!hasTitle && lineCount === 1) {
		return "focus";
	}
	return "body-only";
}

function splitCommaContent(line) {
	const items = [];
	let current = "";
	let quote = "";
	for (const character of String(line || "")) {
		if ((character === '"' || character === "'") && !quote) {
			quote = character;
			current += character;
			continue;
		}
		if (character === quote) {
			quote = "";
			current += character;
			continue;
		}
		if (character === "," && !quote) {
			items.push(current.trim());
			current = "";
			continue;
		}
		current += character;
	}
	if (current.trim()) {
		items.push(current.trim());
	}
	return items.filter(Boolean);
}

function quotedContentValue(value) {
	const text = String(value || "").trim();
	const first = text[0];
	const last = text[text.length - 1];
	if (
		text.length >= 2 &&
		((first === '"' && last === '"') || (first === "'" && last === "'"))
	) {
		return text.slice(1, -1).replaceAll(`${first}${first}`, first).trim();
	}
	return null;
}

function safeHttpUrl(value) {
	const text = String(value || "").trim();
	try {
		const url = new URL(text);
		return url.protocol === "http:" || url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

function parseImageReference(value) {
	const text = String(value || "").trim();
	const markdown = text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
	if (markdown) {
		const parsed = parseImageReference(markdown[2]);
		return parsed ? { ...parsed, alt: markdown[1] || "Image" } : null;
	}
	if (/^ourstuff-asset:[a-z0-9-]+$/i.test(text)) {
		return {
			type: "local",
			id: text.replace(/^ourstuff-asset:/i, ""),
			alt: "Image",
		};
	}
	const url = safeHttpUrl(text);
	if (
		url &&
		/\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(
			`${url.pathname}${url.search}`,
		)
	) {
		return { type: "remote", src: url.href, alt: "Image" };
	}
	return null;
}

function parseMarkdownImageReference(value) {
	const text = String(value || "").trim();
	const markdown = text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
	if (!markdown) {
		return null;
	}
	const parsed = parseImageReference(markdown[2]);
	return parsed ? { ...parsed, alt: markdown[1] || "Image" } : null;
}

function parseImageOnlyBody(body) {
	const items = nonEmptyPageLines(body).flatMap(splitCommaContent);
	if (!items.length) {
		return null;
	}
	const images = items.map(parseMarkdownImageReference);
	if (!images.every(Boolean)) {
		return null;
	}
	return images.length === 1
		? { type: "image", item: images[0] }
		: { type: "gallery", items: images };
}

function blockquoteContentValue(value) {
	const text = String(value || "").trim();
	if (!text.startsWith(">")) {
		return null;
	}
	const quote = text.replace(/^>\s?/, "").trim();
	return quote || null;
}

function youtubeVideoId(value) {
	const url = safeHttpUrl(value);
	if (!url) {
		return "";
	}
	const host = url.hostname.replace(/^www\./, "").toLowerCase();
	let id = "";
	if (host === "youtu.be") {
		id = url.pathname.split("/").filter(Boolean)[0] || "";
	}
	if (host === "youtube.com" || host === "m.youtube.com") {
		if (url.pathname === "/watch") {
			id = url.searchParams.get("v") || "";
		} else {
			const parts = url.pathname.split("/").filter(Boolean);
			if (parts[0] === "embed" || parts[0] === "shorts") {
				id = parts[1] || "";
			}
		}
	}
	return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : "";
}

function parseYoutubeReference(value) {
	const id = youtubeVideoId(value);
	return id ? { id, embedUrl: `https://www.youtube.com/embed/${id}` } : null;
}

export function parseSingleLineContent(line) {
	const text = String(line || "").trim();
	if (!text) {
		return { type: "text", text: "" };
	}
	const items = splitCommaContent(text);
	if (items.length > 1) {
		const images = items.map(parseMarkdownImageReference);
		if (images.every(Boolean)) {
			return { type: "gallery", items: images };
		}
		const videos = items.map(parseYoutubeReference);
		if (videos.every(Boolean)) {
			return { type: "video-list", items: videos };
		}
		const quotes = items.map(quotedContentValue);
		if (quotes.every((quote) => quote !== null && quote.length > 0)) {
			return { type: "quote-list", items: quotes };
		}
		const blockquotes = items.map(blockquoteContentValue);
		if (blockquotes.every((quote) => quote !== null && quote.length > 0)) {
			return { type: "quote-list", items: blockquotes };
		}
	}
	const quote = blockquoteContentValue(text);
	if (quote) {
		return { type: "quote-list", items: [quote] };
	}
	const image = parseImageReference(text);
	if (image) {
		return { type: "image", item: image };
	}
	const video = parseYoutubeReference(text);
	if (video) {
		return { type: "youtube", item: video };
	}
	return { type: "text", text };
}

function focusImageHtml(image) {
	if (!image) {
		return "";
	}
	if (image.type === "local") {
		return `<img data-local-asset="${escapeHtml(image.id)}" alt="${escapeHtml(image.alt || "Image")}">`;
	}
	return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || "Image")}" loading="lazy">`;
}

function youtubeEmbedHtml(video, label = "YouTube video") {
	return `
    <iframe
      title="${escapeHtml(label)}"
      src="${escapeHtml(video.embedUrl)}"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
}

export function themedChildViewerHtml(parsed, options = {}) {
	if (parsed.type === "image") {
		return `<div class="themed-child-viewer themed-child-viewer--image">${focusImageHtml(parsed.item)}</div>`;
	}
	if (parsed.type === "youtube") {
		return `<div class="themed-child-viewer themed-child-viewer--video">${youtubeEmbedHtml(parsed.item)}</div>`;
	}
	if (parsed.type === "gallery") {
		const total = Math.max(1, parsed.items.length);
		const maxPage = Math.max(0, total - 1);
		const page = Math.min(
			Math.max(0, Number(options.galleryPage) || 0),
			maxPage,
		);
		const hasPrev = page > 0;
		const hasNext = page < maxPage;
		const galleryKey = String(options.galleryKey || "");
		return `
      <div class="themed-child-viewer themed-child-viewer--gallery reader-gallery-carousel">
        <div class="reader-gallery-frame">
          <figure>${focusImageHtml(parsed.items[page])}</figure>
        </div>
        <div class="reader-gallery-controls" aria-label="Photo gallery controls">
          <button class="reader-gallery-edge${hasPrev ? " is-available" : ""}" data-action="reader-gallery-page" data-gallery-key="${escapeHtml(galleryKey)}" data-direction="prev" data-max-page="${maxPage}" type="button" aria-label="Previous photo"${hasPrev && galleryKey ? "" : " disabled"}>&larr;</button>
          <span class="reader-gallery-label">${escapeHtml(`Photo ${page + 1} of ${total}`)}</span>
          <button class="reader-gallery-edge${hasNext ? " is-available" : ""}" data-action="reader-gallery-page" data-gallery-key="${escapeHtml(galleryKey)}" data-direction="next" data-max-page="${maxPage}" type="button" aria-label="Next photo"${hasNext && galleryKey ? "" : " disabled"}>&rarr;</button>
        </div>
      </div>
    `;
	}
	if (parsed.type === "video-list") {
		return `
      <div class="themed-child-viewer themed-child-viewer--videos">
        ${parsed.items.map((item, index) => `<figure>${youtubeEmbedHtml(item, `YouTube video ${index + 1}`)}</figure>`).join("")}
      </div>
    `;
	}
	if (parsed.type === "quote-list") {
		return `
      <div class="themed-child-viewer themed-child-viewer--quotes">
        ${parsed.items.map((quote) => `<blockquote>${escapeHtml(quote)}</blockquote>`).join("")}
      </div>
    `;
	}
	return `<div class="themed-child-viewer themed-child-viewer--text"><p>${escapeHtml(parsed.text || "")}</p></div>`;
}

export function pageNumberOverlayHtml({
	current = 1,
	total = 1,
	label = "Page",
} = {}) {
	const safeTotal = Math.max(1, Number(total) || 1);
	const safeCurrent = Math.min(Math.max(1, Number(current) || 1), safeTotal);
	return `<div class="page-number-overlay" aria-label="${escapeHtml(`${label} ${safeCurrent} of ${safeTotal}`)}">${escapeHtml(`${label} ${safeCurrent} of ${safeTotal}`)}</div>`;
}

export function pageContentHtml(title, body, pageContext = {}) {
	const mode = inferPageDisplayMode({ title, body });
	const lines = nonEmptyPageLines(body);
	const cleanTitle = String(title || "").trim();
	const pageNumber = pageContext.skipPageNumber
		? ""
		: pageNumberOverlayHtml(pageContext);
	const imageOnlyBody = parseImageOnlyBody(body);
	if (imageOnlyBody) {
		return `
      <article class="page-content page-content--focus page-content--media">
        ${cleanTitle ? `<h2 class="page-content-media-title">${escapeHtml(cleanTitle)}</h2>` : ""}
        ${themedChildViewerHtml(imageOnlyBody, pageContext)}
        ${pageNumber}
      </article>
    `;
	}
	if (mode === "part") {
		return `
      <article class="page-content page-content--part">
        <h2>${escapeHtml(cleanTitle)}</h2>
        ${pageNumber}
      </article>
    `;
	}
	if (mode === "chapter") {
		return `
      <article class="page-content page-content--chapter">
        <h2>${escapeHtml(cleanTitle)}</h2>
        <p>${escapeHtml(lines[0] || "")}</p>
        ${pageNumber}
      </article>
    `;
	}
	if (mode === "focus") {
		return `
      <article class="page-content page-content--focus">
        ${themedChildViewerHtml(parseSingleLineContent(lines[0] || ""))}
        ${pageNumber}
      </article>
    `;
	}
	if (mode === "body-only") {
		return `
      <article class="page-content page-content--body-only">
        <div class="markdown-body">${body ? renderMarkdown(body) : "<p>No note text yet.</p>"}</div>
        ${pageNumber}
      </article>
    `;
	}
	return `
    <article class="page-content page-content--normal">
      <h2 class="page-content-title">${escapeHtml(cleanTitle)}</h2>
      <div class="markdown-body">${readerBodyHtml(cleanTitle, body)}</div>
      ${pageNumber}
    </article>
  `;
}

function stripDuplicateTitleLine(title, body) {
	const lines = String(body || "").split(/\r?\n/);
	const firstContentIndex = lines.findIndex((line) => line.trim());
	if (firstContentIndex === -1) {
		return "";
	}
	const normalizedTitle = normalizeReaderTitle(title);
	const normalizedFirstLine = normalizeReaderTitle(lines[firstContentIndex]);
	if (normalizedTitle && normalizedFirstLine === normalizedTitle) {
		lines.splice(firstContentIndex, 1);
	}
	return lines.join("\n").trim();
}

function normalizeReaderTitle(value) {
	return String(value || "")
		.replace(/^[#>\s*-]+/, "")
		.replace(/[`*_~]/g, "")
		.trim()
		.toLowerCase();
}
