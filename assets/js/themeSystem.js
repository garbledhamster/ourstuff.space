const DEFAULT_COLOR_FIELDS = Object.freeze([
	"primaryColor",
	"secondaryColor",
	"backgroundColor",
	"surfaceColor",
	"surfaceMutedColor",
	"borderColor",
	"textColor",
	"textMutedColor",
	"dangerColor",
]);

const DEFAULT_COLORS = Object.freeze({
	primaryColor: "#38bdf8",
	secondaryColor: "#22c55e",
	backgroundColor: "#020617",
	surfaceColor: "#0f172a",
	surfaceMutedColor: "#111827",
	borderColor: "#334155",
	textColor: "#f8fafc",
	textMutedColor: "#94a3b8",
	dangerColor: "#fca5a5",
});

const DEFAULT_FONT_SETS = Object.freeze({
	classic: {
		label: "Classic",
		body: '"Aptos", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
		display: 'Georgia, "Times New Roman", serif',
		labelFont: '"Bahnschrift", "Aptos", "Segoe UI", system-ui, sans-serif',
		mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
	},
});

const DEFAULT_STYLE_PROPERTIES = Object.freeze([
	"color-scheme",
	"--bg",
	"--surface",
	"--surface-2",
	"--panel",
	"--border",
	"--border-soft",
	"--border-strong",
	"--border-muted",
	"--border-accent",
	"--border-accent-soft",
	"--theme-divider",
	"--text",
	"--muted",
	"--faint",
	"--accent",
	"--accent-2",
	"--danger",
	"--theme-hover",
	"--theme-control",
	"--theme-control-hover",
	"--theme-select-bg",
	"--theme-select-text",
	"--theme-select-option-bg",
	"--theme-select-option-text",
	"--theme-select-option-active",
	"--theme-select-option-active-text",
	"--theme-ring",
	"--theme-shadow",
	"--on-bg",
	"--on-surface",
	"--on-surface-2",
	"--on-accent",
	"--on-accent-2",
	"--on-danger",
	"--font-body",
	"--font-display",
	"--font-label",
	"--font-mono",
]);

export const THEME_COLOR_FIELDS = DEFAULT_COLOR_FIELDS;
export const THEME_STYLE_PROPERTIES = DEFAULT_STYLE_PROPERTIES;
export const DEFAULT_THEME_STORAGE_KEY = "app.theme.v1";

function safeStorage(storage) {
	if (storage) {return storage;}
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function themeFallbackId(themes, fallbackId) {
	return themes.some((theme) => theme.id === fallbackId)
		? fallbackId
		: themes[0]?.id || "";
}

export function normalizeTheme(
	value,
	{ themes = [], fallbackId = "default" } = {},
) {
	const fallback = themeFallbackId(themes, fallbackId);
	return themes.some((theme) => theme.id === value) ? value : fallback;
}

export function loadTheme({
	storageKey = DEFAULT_THEME_STORAGE_KEY,
	storage,
	themes = [],
	fallbackId = "default",
} = {}) {
	try {
		return normalizeTheme(safeStorage(storage)?.getItem(storageKey), {
			themes,
			fallbackId,
		});
	} catch {
		return normalizeTheme("", { themes, fallbackId });
	}
}

export function saveTheme(
	themeId,
	{
		storageKey = DEFAULT_THEME_STORAGE_KEY,
		storage,
		themes = [],
		fallbackId = "default",
	} = {},
) {
	const normalized = normalizeTheme(themeId, { themes, fallbackId });
	try {
		safeStorage(storage)?.setItem(storageKey, normalized);
	} catch {
		// Persistence is optional; applying the current session theme should still work.
	}
	return normalized;
}

export function themeById(
	themeId,
	{ themes = [], fallbackId = "default" } = {},
) {
	const normalized = normalizeTheme(themeId, { themes, fallbackId });
	return themes.find((theme) => theme.id === normalized) || themes[0] || null;
}

export function missingThemeColorFields(theme) {
	if (!theme?.colors) {return DEFAULT_COLOR_FIELDS;}
	return DEFAULT_COLOR_FIELDS.filter((field) => !theme.colors[field]);
}

export function themeColors(theme) {
	return {
		...DEFAULT_COLORS,
		...(theme?.colors || {}),
	};
}

export function hexToRgb(value) {
	const hex = String(value || "")
		.replace("#", "")
		.trim();
	const normalized =
		hex.length === 3
			? hex
					.split("")
					.map((char) => `${char}${char}`)
					.join("")
			: hex.padEnd(6, "0").slice(0, 6);
	const number = Number.parseInt(normalized, 16);
	if (Number.isNaN(number)) {return { r: 0, g: 0, b: 0 };}
	return {
		r: (number >> 16) & 255,
		g: (number >> 8) & 255,
		b: number & 255,
	};
}

export function colorWithAlpha(value, alpha = 1) {
	const { r, g, b } = hexToRgb(value);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function relativeLuminance(value) {
	const { r, g, b } = hexToRgb(value);
	const channels = [r, g, b].map((channel) => {
		const normalized = channel / 255;
		return normalized <= 0.03928
			? normalized / 12.92
			: ((normalized + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(colorA, colorB) {
	const light = Math.max(relativeLuminance(colorA), relativeLuminance(colorB));
	const dark = Math.min(relativeLuminance(colorA), relativeLuminance(colorB));
	return (light + 0.05) / (dark + 0.05);
}

export function readableTextFor(background, preferred = "#ffffff") {
	const lightText = "#ffffff";
	const darkText = "#000000";
	const preferredRatio = contrastRatio(background, preferred);
	const lightRatio = contrastRatio(background, lightText);
	const darkRatio = contrastRatio(background, darkText);
	if (preferredRatio >= 4.5) {return preferred;}
	return lightRatio >= darkRatio ? lightText : darkText;
}

export function themeFonts(
	theme,
	{ fontSets = DEFAULT_FONT_SETS, fallbackFontSet = "classic" } = {},
) {
	return {
		...(fontSets[fallbackFontSet] || DEFAULT_FONT_SETS.classic),
		...(fontSets[theme?.fontSet] || {}),
		...(theme?.fonts || {}),
	};
}

export function applyThemeFontVariables(root, theme, options = {}) {
	const fonts = themeFonts(theme, options);
	root.style.setProperty("--font-body", fonts.body);
	root.style.setProperty("--font-display", fonts.display);
	root.style.setProperty("--font-label", fonts.labelFont);
	root.style.setProperty("--font-mono", fonts.mono);
}

export function themeClassNames(themes = [], classPrefix = "theme-") {
	return themes.map((theme) => `${classPrefix}${theme.id}`);
}

export function themeUsesLineContrast(theme) {
	return (
		theme?.contrastMode === "line" ||
		theme?.contrastMode === "console" ||
		theme?.effects?.contrastMode === "line" ||
		theme?.effects?.contrastMode === "console"
	);
}

export function resolveThemeTokens(theme) {
	const colors = themeColors(theme);
	const lightTheme = theme?.colorScheme === "light";
	const lineContrast = themeUsesLineContrast(theme);
	return {
		"color-scheme": theme?.colorScheme || "dark",
		"--bg": colors.backgroundColor,
		"--surface": colors.surfaceColor,
		"--surface-2": colors.surfaceMutedColor,
		"--panel": colorWithAlpha(colors.surfaceColor, lightTheme ? 0.96 : 0.92),
		"--border": lineContrast
			? colors.primaryColor
			: colorWithAlpha(colors.primaryColor, lightTheme ? 0.42 : 0.48),
		"--border-soft": colorWithAlpha(
			colors.primaryColor,
			lineContrast ? 0.58 : lightTheme ? 0.2 : 0.26,
		),
		"--border-strong": lineContrast
			? colors.primaryColor
			: colorWithAlpha(colors.primaryColor, lightTheme ? 0.72 : 0.78),
		"--border-muted": colorWithAlpha(
			colors.secondaryColor,
			lineContrast ? 0.46 : lightTheme ? 0.28 : 0.3,
		),
		"--border-accent": colors.primaryColor,
		"--border-accent-soft": colorWithAlpha(
			colors.primaryColor,
			lineContrast ? 0.74 : lightTheme ? 0.54 : 0.6,
		),
		"--theme-divider": colorWithAlpha(
			colors.secondaryColor,
			lineContrast ? 0.42 : lightTheme ? 0.24 : 0.22,
		),
		"--text": colors.textColor,
		"--muted": colors.textMutedColor,
		"--faint": colorWithAlpha(colors.textMutedColor, 0.72),
		"--accent": colors.primaryColor,
		"--accent-2": colors.secondaryColor,
		"--danger": colors.dangerColor,
		"--theme-hover": colors.surfaceMutedColor,
		"--theme-control": colors.surfaceColor,
		"--theme-control-hover": colors.surfaceMutedColor,
		"--theme-select-bg": colors.surfaceColor,
		"--theme-select-text": readableTextFor(
			colors.surfaceColor,
			colors.textColor,
		),
		"--theme-select-option-bg": colors.surfaceMutedColor,
		"--theme-select-option-text": readableTextFor(
			colors.surfaceMutedColor,
			colors.textColor,
		),
		"--theme-select-option-active": colors.primaryColor,
		"--theme-select-option-active-text": readableTextFor(
			colors.primaryColor,
			colors.textColor,
		),
		"--theme-ring": colorWithAlpha(colors.primaryColor, 0.34),
		"--theme-shadow": colorWithAlpha(
			lightTheme ? colors.primaryColor : colors.backgroundColor,
			lightTheme ? 0.18 : 0.48,
		),
		"--on-bg": readableTextFor(colors.backgroundColor, colors.textColor),
		"--on-surface": readableTextFor(colors.surfaceColor, colors.textColor),
		"--on-surface-2": readableTextFor(
			colors.surfaceMutedColor,
			colors.textColor,
		),
		"--on-accent": readableTextFor(colors.primaryColor, colors.textColor),
		"--on-accent-2": readableTextFor(colors.secondaryColor, colors.textColor),
		"--on-danger": readableTextFor(colors.dangerColor, colors.textColor),
	};
}

export function applyThemeVariables(
	themeId,
	{
		root,
		themes = [],
		fallbackId = "default",
		fontSets = DEFAULT_FONT_SETS,
		fallbackFontSet = "classic",
		classPrefix = "theme-",
		paletteClass = "theme-palette",
		styleProperties = DEFAULT_STYLE_PROPERTIES,
		target,
		setDataset = true,
	} = {},
) {
	const theme = themeById(themeId, { themes, fallbackId });
	const selectedRoot = root || document.documentElement;
	if (!theme || !selectedRoot) {return null;}

	themeClassNames(themes, classPrefix).forEach((className) => {
		selectedRoot.classList.remove(className);
	});
	selectedRoot.classList.toggle(paletteClass, Boolean(theme.colors));
	selectedRoot.classList.add(`${classPrefix}${theme.id}`);

	styleProperties.forEach((property) => {
		selectedRoot.style.removeProperty(property);
	});
	applyThemeFontVariables(selectedRoot, theme, { fontSets, fallbackFontSet });

	if (theme.colors) {
		const tokens = resolveThemeTokens(theme);
		Object.entries(tokens).forEach(([property, value]) => {
			selectedRoot.style.setProperty(property, value);
		});
	}

	if (setDataset && target) {target.dataset.theme = theme.id;}
	return theme;
}

export function createThemeController(options = {}) {
	let activeThemeId = normalizeTheme(
		options.initialTheme || loadTheme(options),
		options,
	);
	return {
		get themeId() {
			return activeThemeId;
		},
		theme(themeId = activeThemeId) {
			return themeById(themeId, options);
		},
		apply(themeId = activeThemeId) {
			activeThemeId = normalizeTheme(themeId, options);
			return applyThemeVariables(activeThemeId, options);
		},
		set(themeId) {
			activeThemeId = saveTheme(themeId, options);
			return this.apply(activeThemeId);
		},
		load() {
			activeThemeId = loadTheme(options);
			return activeThemeId;
		},
	};
}

export function themePreviewStyle(theme) {
	const colors = themeColors(theme);
	return [
		`--theme-preview-bg:${colors.surfaceColor}`,
		`--theme-preview-border:${colorWithAlpha(colors.primaryColor, theme?.colorScheme === "light" ? 0.54 : 0.62)}`,
		`--theme-preview-text:${colors.textColor}`,
		`--theme-preview-muted:${colors.textMutedColor}`,
		`--theme-preview-accent:${colors.primaryColor}`,
		`--theme-preview-secondary:${colors.secondaryColor}`,
	].join(";");
}

export function themeFontLabel(theme, options = {}) {
	return themeFonts(theme, options).label || "Theme";
}
