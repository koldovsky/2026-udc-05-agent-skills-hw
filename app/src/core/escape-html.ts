// Shared, dependency-free HTML escaping for widget factories.
//
// Widgets return HTML strings that consumers typically assign to innerHTML, so
// any prop interpolated into markup must be escaped here. TypeScript cannot
// carry this guarantee: `create(name, props)` takes `Record<string, unknown>`,
// so a JS caller reaches every factory with arbitrary runtime values.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Escapes the five characters that can break out of text content or an
// attribute value. Non-string input is coerced, since it can arrive via
// `create()` regardless of a factory's declared props.
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}
