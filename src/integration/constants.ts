export const DEFAULT_PROTOCOL_SAY_MAX_LENGTH = 280;
export const PROTOCOL_TTL_MIN_MS = 500;
export const PROTOCOL_TTL_MAX_MS = 60000;

export function clampProtocolTtlMs(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return Math.round(fallback);
  }
  return Math.round(Math.min(Math.max(value, PROTOCOL_TTL_MIN_MS), PROTOCOL_TTL_MAX_MS));
}

export function parseProtocolTtlMs(
  value: string | "true" | undefined,
  fallback: number
): number {
  if (typeof value !== "string") {
    return Math.round(fallback);
  }

  return clampProtocolTtlMs(Number(value), fallback);
}

export function normalizeProtocolText(
  value: string | "true" | undefined,
  maxLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, Math.max(1, Math.round(maxLength)));
}
