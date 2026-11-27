/**
 * Contact form rules, shared by the form (live feedback, the Send button) and the server (functions/api/contact.ts),
 * so a message the page accepts is always one the server accepts, and bypassing the page gets no junk through.
 */
export const LIMITS = { name: [2, 80], email: [6, 200], idea: [20, 2000], budget: [0, 80] } as const;
/** a submission sooner than this after the form appeared is a bot */
export const MIN_FILL_MS = 3000;
/** one message per minute from the same browser */
export const COOLDOWN_MS = 60_000;

export type Field = 'name' | 'email' | 'idea' | 'budget';
export type Values = Record<Field, string>;

// letters in any language, then letters, spaces, apostrophes, hyphens and dots
const NAME = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// letters, digits, spaces and the usual money signs and separators
const BUDGET = /^[\p{L}\p{N} $€£₹¥.,+\-–/kKmM]*$/u;
const URLS = /(https?:\/\/|www\.)\S+/gi;

/** the reason a field is not acceptable (a key of contact.errors), or null when it is fine */
export function check(field: Field, raw: string): 'required' | 'short' | 'long' | 'format' | 'spam' | null {
  const v = raw.trim();
  const [min, max] = LIMITS[field];
  if (field === 'budget' && !v) return null;
  if (!v) return 'required';
  if (v.length > max) return 'long';
  if (v.length < min) return 'short';
  if (field === 'name') return NAME.test(v) ? null : 'format';
  if (field === 'email') return EMAIL.test(v) ? null : 'format';
  if (field === 'budget') return BUDGET.test(v) ? null : 'format';
  // the project details: real words, not links, repeated characters or keyboard mashing
  const words = v.match(/\p{L}{2,}/gu) ?? [];
  if (words.length < 3) return 'spam';
  if ((v.match(URLS) ?? []).length > 2) return 'spam';
  if (/(.)\1{9,}/u.test(v)) return 'spam';
  return null;
}

export const valid = (values: Values) => (Object.keys(LIMITS) as Field[]).every((f) => check(f, values[f] ?? '') === null);
