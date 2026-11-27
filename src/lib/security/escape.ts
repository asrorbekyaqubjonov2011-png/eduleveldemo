/**
 * Escaping for user-supplied text sent to Telegram with parse_mode HTML.
 * Telegram accepts only &amp; &lt; &gt; &quot; as entities; any other `<` or `&` makes the message fail
 * (or lets a name inject tags such as <a href>). Use escapeHtml for every interpolated value.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Caps the source text to maxLength characters, then escapes it. */
export function escapeHtmlLimited(value: unknown, maxLength: number): string {
  const text = String(value ?? '');
  return escapeHtml(text.length > maxLength ? text.slice(0, maxLength) : text);
}
