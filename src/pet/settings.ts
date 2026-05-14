import {
  isPetActionAnimationId,
  PET_ACTION_ANIMATION_IDS,
  PET_IDLE_SELF_PLAY_ANIMATION_IDS,
  type PetActionAnimationId
} from "./animation";
import {
  getCatalogPet,
  getCombinedPetCatalog,
  type ImportedPetRecord,
  type PetCatalogItem,
  type PetId
} from "./catalog";

export type PetLanguage = "en" | "zh-CN";
export type ClickActionMode = "fixed" | "random";
export type IdleActionId = "random" | "active-action" | PetActionAnimationId;
export type BubbleStyle = "soft" | "comic" | "glass" | "terminal";
export type PetWindowPosition = {
  x: number;
  y: number;
};

const BUBBLE_STYLES = ["soft", "comic", "glass", "terminal"] as const;
const LANGUAGE_OPTIONS = ["en", "zh-CN"] as const;
const IDLE_ACTION_IDS = [
  "random",
  "active-action",
  ...PET_IDLE_SELF_PLAY_ANIMATION_IDS,
  "failed"
] as const satisfies readonly IdleActionId[];

export type PetsidianSettings = {
  visible: boolean;
  language: PetLanguage;
  scale: number;
  reducedMotion: boolean;
  activePetId: PetId;
  clickActionMode: ClickActionMode;
  clickAction: PetActionAnimationId;
  clickActionPool: PetActionAnimationId[];
  eventReactions: boolean;
  eventBubbles: boolean;
  eventBubbleTtlMs: number;
  bubbleStyle: BubbleStyle;
  bubbleFontFamily: string;
  bubbleFontSizePx: number;
  bubbleMaxWidthPx: number;
  autonomousWalking: boolean;
  walkingSpeedPx: number;
  hoverPause: boolean;
  idleSelfPlay: boolean;
  idleThresholdMs: number;
  idleActionFrequencyMs: number;
  idleAction: IdleActionId;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
  importedPets: ImportedPetRecord[];
  windowPosition: PetWindowPosition | null;
};

export const DEFAULT_SETTINGS: PetsidianSettings = {
  visible: true,
  language: "en",
  scale: 1,
  reducedMotion: false,
  activePetId: "nia",
  clickActionMode: "random",
  clickAction: "waving",
  clickActionPool: ["waving", "jumping", "waiting", "running", "review"],
  eventReactions: true,
  eventBubbles: true,
  eventBubbleTtlMs: 4000,
  bubbleStyle: "soft",
  bubbleFontFamily: "Aptos Display",
  bubbleFontSizePx: 14,
  bubbleMaxWidthPx: 292,
  autonomousWalking: false,
  walkingSpeedPx: 48,
  hoverPause: true,
  idleSelfPlay: true,
  idleThresholdMs: 45000,
  idleActionFrequencyMs: 30000,
  idleAction: "random",
  alwaysOnTop: true,
  skipTaskbar: true,
  importedPets: [],
  windowPosition: null
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

function readString(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
}

function readLanguage(source: Record<string, unknown>): PetLanguage {
  const value = source.language;
  return LANGUAGE_OPTIONS.includes(value as PetLanguage) ? (value as PetLanguage) : DEFAULT_SETTINGS.language;
}

function readClickActionMode(source: Record<string, unknown>): ClickActionMode {
  return source.clickActionMode === "fixed" || source.clickActionMode === "random"
    ? source.clickActionMode
    : DEFAULT_SETTINGS.clickActionMode;
}

function readBubbleStyle(source: Record<string, unknown>): BubbleStyle {
  const value = source.bubbleStyle;
  return BUBBLE_STYLES.includes(value as BubbleStyle)
    ? (value as BubbleStyle)
    : DEFAULT_SETTINGS.bubbleStyle;
}

function readIdleAction(source: Record<string, unknown>): IdleActionId {
  const value = source.idleAction;
  return IDLE_ACTION_IDS.includes(value as IdleActionId)
    ? (value as IdleActionId)
    : DEFAULT_SETTINGS.idleAction;
}

function readActionPool(source: Record<string, unknown>): PetActionAnimationId[] {
  const value = source.clickActionPool;
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.clickActionPool];

  const pool = value.filter(isPetActionAnimationId);
  return pool.length > 0 ? [...new Set(pool)] : [...DEFAULT_SETTINGS.clickActionPool];
}

function readBubbleTtlMs(source: Record<string, unknown>): number {
  const fallbackFromLegacy = readNumber(
    source,
    "bubbleTtlMs",
    DEFAULT_SETTINGS.eventBubbleTtlMs,
    500,
    60000
  );
  return Math.round(readNumber(source, "eventBubbleTtlMs", fallbackFromLegacy, 500, 60000));
}

function readActivePetId(
  source: Record<string, unknown>,
  catalog: readonly PetCatalogItem[]
): PetId {
  const rawPetId = source.activePetId;
  return typeof rawPetId === "string"
    ? getCatalogPet(rawPetId, catalog).id
    : DEFAULT_SETTINGS.activePetId;
}

function isImportedPetRecord(value: unknown): value is ImportedPetRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.description === "string" &&
    typeof value.spritesheetDataUrl === "string"
  );
}

function normalizeImportedPet(pet: ImportedPetRecord): ImportedPetRecord | null {
  const id = pet.id.trim();
  const displayName = pet.displayName.trim();
  const description = pet.description.trim();
  const spritesheetDataUrl = pet.spritesheetDataUrl.trim();
  if (
    id.length < 2 ||
    displayName.length === 0 ||
    description.length === 0 ||
    !spritesheetDataUrl.startsWith("data:image/webp;base64,")
  ) {
    return null;
  }

  return {
    id: id.toLowerCase(),
    displayName: displayName.slice(0, 96),
    description: description.slice(0, 280),
    spritesheetDataUrl,
    sourceName: pet.sourceName?.trim().slice(0, 80) || null,
    sourceUrl: pet.sourceUrl?.trim().slice(0, 500) || null
  };
}

function readImportedPets(source: Record<string, unknown>): ImportedPetRecord[] {
  const rawImportedPets = source.importedPets;
  if (!Array.isArray(rawImportedPets)) return [];

  const normalized: ImportedPetRecord[] = [];
  const seenIds = new Set<string>();
  for (const entry of rawImportedPets) {
    if (!isImportedPetRecord(entry)) continue;
    const next = normalizeImportedPet(entry);
    if (next === null || seenIds.has(next.id)) continue;
    seenIds.add(next.id);
    normalized.push(next);
  }
  return normalized;
}

function readWindowPosition(source: Record<string, unknown>): PetWindowPosition | null {
  const rawPosition = source.windowPosition;
  if (!isRecord(rawPosition)) return null;
  const x = rawPosition.x;
  const y = rawPosition.y;
  if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }
  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}

export function normalizePetsidianSettings(raw: unknown): PetsidianSettings {
  if (!isRecord(raw)) {
    return {
      ...DEFAULT_SETTINGS,
      clickActionPool: [...DEFAULT_SETTINGS.clickActionPool],
      importedPets: [],
      windowPosition: null
    };
  }

  const importedPets = readImportedPets(raw);
  const catalog = getCombinedPetCatalog(importedPets);

  const rawClickAction = typeof raw.clickAction === "string" ? raw.clickAction : null;
  const clickAction = isPetActionAnimationId(rawClickAction)
    ? rawClickAction
    : DEFAULT_SETTINGS.clickAction;
  const eventBubblesFallback = readBoolean(
    raw,
    "bubblesEnabled",
    DEFAULT_SETTINGS.eventBubbles
  );
  const fontFamily = readString(raw, "bubbleFontFamily", DEFAULT_SETTINGS.bubbleFontFamily)
    .trim()
    .slice(0, 80);

  return {
    visible: readBoolean(raw, "visible", DEFAULT_SETTINGS.visible),
    language: readLanguage(raw),
    scale: readNumber(raw, "scale", DEFAULT_SETTINGS.scale, 0.5, 2),
    reducedMotion: readBoolean(raw, "reducedMotion", DEFAULT_SETTINGS.reducedMotion),
    activePetId: readActivePetId(raw, catalog),
    clickActionMode: readClickActionMode(raw),
    clickAction,
    clickActionPool: readActionPool(raw),
    eventReactions: readBoolean(raw, "eventReactions", DEFAULT_SETTINGS.eventReactions),
    eventBubbles: readBoolean(raw, "eventBubbles", eventBubblesFallback),
    eventBubbleTtlMs: readBubbleTtlMs(raw),
    bubbleStyle: readBubbleStyle(raw),
    bubbleFontFamily: fontFamily.length > 0 ? fontFamily : DEFAULT_SETTINGS.bubbleFontFamily,
    bubbleFontSizePx: Math.round(
      readNumber(raw, "bubbleFontSizePx", DEFAULT_SETTINGS.bubbleFontSizePx, 10, 28)
    ),
    bubbleMaxWidthPx: Math.round(
      readNumber(raw, "bubbleMaxWidthPx", DEFAULT_SETTINGS.bubbleMaxWidthPx, 180, 520)
    ),
    autonomousWalking: readBoolean(raw, "autonomousWalking", DEFAULT_SETTINGS.autonomousWalking),
    walkingSpeedPx: readNumber(raw, "walkingSpeedPx", DEFAULT_SETTINGS.walkingSpeedPx, 1, 240),
    hoverPause: readBoolean(raw, "hoverPause", DEFAULT_SETTINGS.hoverPause),
    idleSelfPlay: readBoolean(raw, "idleSelfPlay", DEFAULT_SETTINGS.idleSelfPlay),
    idleThresholdMs: Math.round(
      readNumber(raw, "idleThresholdMs", DEFAULT_SETTINGS.idleThresholdMs, 5000, 600000)
    ),
    idleActionFrequencyMs: Math.round(
      readNumber(
        raw,
        "idleActionFrequencyMs",
        DEFAULT_SETTINGS.idleActionFrequencyMs,
        5000,
        600000
      )
    ),
    idleAction: readIdleAction(raw),
    alwaysOnTop: readBoolean(raw, "alwaysOnTop", DEFAULT_SETTINGS.alwaysOnTop),
    skipTaskbar: readBoolean(raw, "skipTaskbar", DEFAULT_SETTINGS.skipTaskbar),
    importedPets,
    windowPosition: readWindowPosition(raw)
  };
}

export function getAvailableActions(): readonly PetActionAnimationId[] {
  return PET_ACTION_ANIMATION_IDS;
}

export function getAvailableIdleActions(): readonly IdleActionId[] {
  return IDLE_ACTION_IDS;
}

export function getBubbleStyles(): readonly BubbleStyle[] {
  return BUBBLE_STYLES;
}

export function getPetsidianCatalog(settings: PetsidianSettings): readonly PetCatalogItem[] {
  return getCombinedPetCatalog(settings.importedPets);
}
