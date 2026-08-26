const tagPattern = /<\/?[a-z][^>]*>/i;

const blockTags = new Set(["p", "h3", "blockquote", "ul", "ol", "li"]);
const inlineTags = new Set(["strong", "em", "u", "s", "sub", "sup", "a"]);
const dangerousBlockPattern =
  /<\s*(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const dangerousSinglePattern =
  /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|meta|link|form|input|button|textarea|select|option)[^>]*>/gi;

export function hasRichTextMarkup(value: string | null | undefined) {
  return Boolean(value && tagPattern.test(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    );
}

function normalizeTagName(tagName: string) {
  const tag = tagName.toLowerCase();
  if (tag === "b") return "strong";
  if (tag === "i") return "em";
  if (tag === "div" || tag === "center") return "p";
  if (/^h[1-6]$/.test(tag)) return "h3";
  return tag;
}

function attrValue(attrs: string, name: string) {
  const quoted = attrs.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (quoted) return quoted[2] ?? quoted[3] ?? "";
  const unquoted = attrs.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted?.[1] ?? "";
}

function alignmentAttribute(rawTag: string, attrs: string) {
  const forcedCenter = rawTag.toLowerCase() === "center";
  const align = attrValue(attrs, "align").toLowerCase();
  const style = attrValue(attrs, "style");
  const styleAlign = style.match(/text-align\s*:\s*(left|center|right|justify)/i)?.[1];
  const next = forcedCenter ? "center" : styleAlign?.toLowerCase() ?? align;
  return /^(left|center|right|justify)$/.test(next)
    ? ` style="text-align: ${next}"`
    : "";
}

function safeHref(attrs: string) {
  const href = decodeEntities(attrValue(attrs, "href").trim());
  if (!href) return null;
  if (/^(https?:|mailto:|\/(?!\/)|#)/i.test(href)) return href;
  return null;
}

export function plainTextToRichTextHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function sanitizeRichTextHtml(value: string) {
  if (!value.trim()) return "";

  return value
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(dangerousBlockPattern, "")
    .replace(dangerousSinglePattern, "")
    .replace(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi, (full, rawTag: string, attrs: string) => {
      const isClosing = /^<\s*\//.test(full);
      const tag = normalizeTagName(rawTag);

      if (tag === "br") return "<br />";
      if (!blockTags.has(tag) && !inlineTags.has(tag)) return "";
      if (isClosing) return `</${tag}>`;

      if (tag === "a") {
        const href = safeHref(attrs);
        return href
          ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">`
          : "";
      }

      if (blockTags.has(tag)) {
        return `<${tag}${alignmentAttribute(rawTag, attrs)}>`;
      }

      return `<${tag}>`;
    })
    .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, "")
    .trim();
}

export function sanitizeInlineRichTextHtml(value: string) {
  return sanitizeRichTextHtml(value)
    .replace(/<\/?(p|h3|blockquote)[^>]*>/gi, " ")
    .replace(/<\/li>/gi, "<br />")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "")
    .replace(/(?:<br\s*\/?>\s*)+$/gi, "")
    .trim();
}

export function richTextToPlainText(value: string | null | undefined) {
  if (!value) return "";
  const html = hasRichTextMarkup(value) ? sanitizeRichTextHtml(value) : escapeHtml(value);

  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/(p|h3|blockquote|li)>/gi, "\n")
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function richTextForEditor(value: string | null | undefined) {
  const text = value ?? "";
  return hasRichTextMarkup(text)
    ? sanitizeRichTextHtml(text)
    : plainTextToRichTextHtml(text);
}

export function cleanRichTextForStorage(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const cleaned = hasRichTextMarkup(raw) ? sanitizeRichTextHtml(raw) : raw;
  return richTextToPlainText(cleaned) ? cleaned : "";
}

export function sanitizeQuestionRichText(value: string | null | undefined) {
  if (!value) return "";
  return cleanRichTextForStorage(value);
}
