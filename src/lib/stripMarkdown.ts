/**
 * Strip common Markdown syntax to plain text for timeline card previews.
 * Used by TimelineCard (Plan 02) per decision D-05.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")        // fenced code blocks FIRST (before inline code)
    .replace(/#{1,6}\s+/g, "")              // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")        // bold
    .replace(/\*(.+?)\*/g, "$1")            // italic
    .replace(/`([^`]+)`/g, "$1")            // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")     // links
    .replace(/^[-*+]\s+/gm, "")             // unordered list markers
    .replace(/^\d+\.\s+/gm, "")             // ordered list markers
    .replace(/^>\s+/gm, "")                 // blockquotes
    .replace(/\n+/g, " ")                   // normalize newlines to spaces
    .trim();
}

/**
 * Truncate plain text to maxChars characters, appending ellipsis when needed.
 * Per decision D-05: 150-character preview with ellipsis.
 */
export function truncatePreview(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "\u2026";
}
