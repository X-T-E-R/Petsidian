import {
  isPetActionAnimationId,
  PET_ACTION_ANIMATION_IDS,
  type PetActionAnimationId
} from "./animation";
import { getCatalogPet, PET_CATALOG, type PetId } from "./catalog";

export type ClickActionMode = "fixed" | "random";

export type PetsidianSettings = {
  visible: boolean;
  scale: number;
  reducedMotion: boolean;
  activePetId: PetId;
  clickActionMode: ClickActionMode;
  clickAction: PetActionAnimationId;
  clickActionPool: PetActionAnimationId[];
  bubblesEnabled: boolean;
  bubbleTtlMs: number;
  autonomousWalking: boolean;
  walkingSpeedPx: number;
  hoverPause: boolean;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
};

export const DEFAULT_SETTINGS: PetsidianSettings = {
  visible: true,
  scale: 1,
  reducedMotion: false,
  activePetId: "nia",
  clickActionMode: "random",
  clickAction: "waving",
  clickActionPool: ["waving", "jumping", "waiting", "running", "review"],
  bubblesEnabled: true,
  bubbleTtlMs: 4000,
  autonomousWalking: false,
  walkingSpeedPx: 48,
  hoverPause: true,
  alwaysOnTop: true,
  skipTaskbar: true
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function readClickActionMode(source: Record<string, unknown>): ClickActionMode {
  return source.clickActionMode === "fixed" || source.clickActionMode === "random"
    ? source.clickActionMode
    : DEFAULT_SETTINGS.clickActionMode;
}

function readActionPool(source: Record<string, unknown>): PetActionAnimationId[] {
  const value = source.clickActionPool;
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.clickActionPool];

  const pool = value.filter(isPetActionAnimationId);
  return pool.length > 0 ? [...new Set(pool)] : [...DEFAULT_SETTINGS.clickActionPool];
}

export function normalizePetsidianSettings(raw: unknown): PetsidianSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS, clickActionPool: [...DEFAULT_SETTINGS.clickActionPool] };

  const rawClickAction = typeof raw.clickAction === "string" ? raw.clickAction : null;
  const clickAction = isPetActionAnimationId(rawClickAction)
    ? rawClickAction
    : DEFAULT_SETTINGS.clickAction;

  const rawPetId = raw.activePetId;
  const activePetId =
    typeof rawPetId === "string" ? getCatalogPet(rawPetId, PET_CATALOG).id : DEFAULT_SETTINGS.activePetId;

  return {
    visible: readBoolean(raw, "visible", DEFAULT_SETTINGS.visible),
    scale: readNumber(raw, "scale", DEFAULT_SETTINGS.scale, 0.5, 2),
    reducedMotion: readBoolean(raw, "reducedMotion", DEFAULT_SETTINGS.reducedMotion),
    activePetId,
    clickActionMode: readClickActionMode(raw),
    clickAction,
    clickActionPool: readActionPool(raw),
    bubblesEnabled: readBoolean(raw, "bubblesEnabled", DEFAULT_SETTINGS.bubblesEnabled),
    bubbleTtlMs: Math.round(
      readNumber(raw, "bubbleTtlMs", DEFAULT_SETTINGS.bubbleTtlMs, 1000, 15000)
    ),
    autonomousWalking: readBoolean(raw, "autonomousWalking", DEFAULT_SETTINGS.autonomousWalking),
    walkingSpeedPx: readNumber(raw, "walkingSpeedPx", DEFAULT_SETTINGS.walkingSpeedPx, 10, 160),
    hoverPause: readBoolean(raw, "hoverPause", DEFAULT_SETTINGS.hoverPause),
    alwaysOnTop: readBoolean(raw, "alwaysOnTop", DEFAULT_SETTINGS.alwaysOnTop),
    skipTaskbar: readBoolean(raw, "skipTaskbar", DEFAULT_SETTINGS.skipTaskbar)
  };
}

export function getAvailableActions(): readonly PetActionAnimationId[] {
  return PET_ACTION_ANIMATION_IDS;
}
