/**
 * Removes a leading project-key prefix from AI-generated titles.
 *
 * The application shows issue keys (e.g. DEMO-11) separately, so titles must not repeat them.
 * Gemini may still add one despite the prompt, so this runs on every generated title.
 *
 * Stripped (with key "DEMO", case-insensitive): "[DEMO] x", "[DEMO-1] x", "DEMO-1: x", "DEMO: x", "DEMO - x".
 * Kept: prefixes without the key ("[WIP] x", "API: x"), and words that merely start with it ("DEMOS: x").
 */

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function stripProjectKeyPrefix(title: string, projectKey: string | undefined | null): string {
  if (typeof title !== 'string') return title;
  const key = (projectKey || '').trim();
  if (!key) return title;

  // Key optionally followed by an issue number: DEMO or DEMO-12.
  const id = `${escapeRegExp(key)}(?:-\\d+)?`;
  const bracketed = new RegExp(`^\\s*\\[\\s*${id}\\s*\\]\\s*(?:[:|\\-–—]\\s*)?`, 'i');
  // Bare form needs an explicit separator so "DEMO-1 Login" is not read as "DEMO" + "-1 Login".
  const bare = new RegExp(`^\\s*${id}(?:\\s*:|\\s+[|\\-–—])\\s*`, 'i');

  let result = title;
  // Repeat to handle stacked prefixes such as "[DEMO] DEMO-3: Login".
  for (let i = 0; i < 3; i += 1) {
    const next = result.replace(bracketed, '').replace(bare, '');
    if (next === result) break;
    result = next;
  }
  const trimmed = result.trim();
  return trimmed.length > 0 ? trimmed : title.trim();
}
