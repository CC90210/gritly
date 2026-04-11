export type JsonObject = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasUnsafeJsonKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeJsonKeys(item));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (UNSAFE_JSON_KEYS.has(key) || hasUnsafeJsonKeys(nestedValue)) {
      return true;
    }
  }

  return false;
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return null;
  }

  return value;
}
