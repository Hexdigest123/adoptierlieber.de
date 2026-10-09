// D1 rejects LIKE patterns over 50 bytes
const MAX_LIKE_PATTERN_BYTES = 50;
const encoder = new TextEncoder();

function build(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Case-insensitive `%term%` pattern for `LIKE ? ESCAPE '\'`, cut to fit D1's pattern limit. */
export function likePattern(q: string): string {
  let chars = Array.from(q.toLowerCase()).slice(0, MAX_LIKE_PATTERN_BYTES - 2);
  while (chars.length && encoder.encode(build(chars.join(""))).length > MAX_LIKE_PATTERN_BYTES) {
    chars = chars.slice(0, -1);
  }
  return build(chars.join(""));
}
