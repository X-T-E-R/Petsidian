import {
  isPetActionAnimationId,
  PET_ACTION_ANIMATION_IDS,
  PET_IDLE_SELF_PLAY_ANIMATION_IDS,
  type PetActionAnimationId
} from "./animation";
import {
  DEFAULT_PROTOCOL_SAY_MAX_LENGTH,
  PROTOCOL_TTL_MAX_MS,
  PROTOCOL_TTL_MIN_MS
} from "../integration/constants";
import {
  DEFAULT_NATIVE_EVENT_COOLDOWN_MS,
  DEFAULT_NATIVE_OBSIDIAN_SIGNAL_SETTINGS,
  NATIVE_OBSIDIAN_SIGNAL_KEYS,
  type NativeObsidianSignalKey,
  type NativeObsidianSignalSettings
} from "../integration/native-events";
import {
  getCatalogPet,
  getCombinedPetCatalog,
  hasImportedPetSpritesheetData,
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

export type PetsidianIntegrationSettings = {
  apiEnabled: boolean;
  protocolHandlerEnabled: boolean;
  protocolSayMaxLength: number;
  protocolDefaultTtlMs: number;
  nativeEventReactionsEnabled: boolean;
  nativeEventCooldownMs: number;
  nativeSignals: NativeObsidianSignalSettings;
};

export type PartialPetsidianIntegrationSettings = Partial<
  Omit<PetsidianIntegrationSettings, "nativeSignals">
> & {
  nativeSignals?: Partial<NativeObsidianSignalSettings>;
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
  integrations: PetsidianIntegrationSettings;
};

export const DEFAULT_INTEGRATION_SETTINGS: PetsidianIntegrationSettings = {
  apiEnabled: true,
  protocolHandlerEnabled: false,
  protocolSayMaxLength: DEFAULT_PROTOCOL_SAY_MAX_LENGTH,
  protocolDefaultTtlMs: 4000,
  nativeEventReactionsEnabled: false,
  nativeEventCooldownMs: DEFAULT_NATIVE_EVENT_COOLDOWN_MS,
  nativeSignals: { ...DEFAULT_NATIVE_OBSIDIAN_SIGNAL_SETTINGS }
};

export const DEFAULT_SETTINGS: PetsidianSettings = {
  visible: true,
  language: "en",
  scale: 1,
  reducedMotion: false,
  activePetId: "petsidian-cub",
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
  windowPosition: null,
  integrations: { ...DEFAULT_INTEGRATION_SETTINGS }
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
  importedPets: readonly ImportedPetRecord[],
  catalog: readonly PetCatalogItem[]
): PetId {
  const rawPetId = source.activePetId;
  if (typeof rawPetId !== "string") {
    return DEFAULT_SETTINGS.activePetId;
  }

  if (importedPets.some((pet) => pet.id === rawPetId)) {
    return rawPetId;
  }

  return getCatalogPet(rawPetId, catalog).id;
}

function isImportedPetRecord(value: unknown): value is ImportedPetRecord {
  if (!isRecord(value)) return false;
  const hasDataUrl =
    typeof value.spritesheetDataUrl === "string" &&
    value.spritesheetDataUrl.length > 0;
  const hasStoragePath =
    typeof value.spritesheetStoragePath === "string" &&
    value.spritesheetStoragePath.length > 0;
  return (
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.description === "string" &&
    (hasDataUrl || hasStoragePath)
  );
}

function normalizeImportedPet(pet: ImportedPetRecord): ImportedPetRecord | null {
  const id = pet.id.trim();
  const displayName = pet.displayName.trim();
  const description = pet.description.trim();
  const spritesheetDataUrl = pet.spritesheetDataUrl?.trim() ?? null;
  const spritesheetStoragePath = pet.spritesheetStoragePath?.trim() ?? null;
  if (
    id.length < 2 ||
    displayName.length === 0 ||
    description.length === 0 ||
    (
      (spritesheetDataUrl === null || !spritesheetDataUrl.startsWith("data:image/webp;base64,")) &&
      (spritesheetStoragePath === null || spritesheetStoragePath.length === 0)
    )
  ) {
    return null;
  }

  return {
    id: id.toLowerCase(),
    displayName: displayName.slice(0, 96),
    description: description.slice(0, 280),
    spritesheetDataUrl,
    spritesheetStoragePath,
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

function readIntegrations(source: Record<string, unknown>): PetsidianIntegrationSettings {
  const rawIntegrations = isRecord(source.integrations) ? source.integrations : null;
  const rawNativeSignals = isRecord(rawIntegrations?.nativeSignals)
    ? rawIntegrations.nativeSignals
    : isRecord(source.nativeSignals)
      ? source.nativeSignals
      : null;

  const apiEnabled = readBoolean(
    rawIntegrations ?? source,
    "apiEnabled",
    readBoolean(source, "integrationApiEnabled", DEFAULT_INTEGRATION_SETTINGS.apiEnabled)
  );
  const protocolHandlerEnabled = readBoolean(
    rawIntegrations ?? source,
    "protocolHandlerEnabled",
    readBoolean(
      source,
      "protocolHandlerEnabled",
      DEFAULT_INTEGRATION_SETTINGS.protocolHandlerEnabled
    )
  );
  const protocolSayMaxLength = Math.round(
    readNumber(
      rawIntegrations ?? source,
      "protocolSayMaxLength",
      readNumber(
        source,
        "integrationProtocolSayMaxLength",
        DEFAULT_INTEGRATION_SETTINGS.protocolSayMaxLength,
        32,
        1000
      ),
      32,
      1000
    )
  );
  const protocolDefaultTtlMs = Math.round(
    readNumber(
      rawIntegrations ?? source,
      "protocolDefaultTtlMs",
      readNumber(
        source,
        "integrationProtocolDefaultTtlMs",
        DEFAULT_INTEGRATION_SETTINGS.protocolDefaultTtlMs,
        PROTOCOL_TTL_MIN_MS,
        PROTOCOL_TTL_MAX_MS
      ),
      PROTOCOL_TTL_MIN_MS,
      PROTOCOL_TTL_MAX_MS
    )
  );
  const nativeEventReactionsEnabled = readBoolean(
    rawIntegrations ?? source,
    "nativeEventReactionsEnabled",
    readBoolean(
      source,
      "nativeEventReactionsEnabled",
      DEFAULT_INTEGRATION_SETTINGS.nativeEventReactionsEnabled
    )
  );
  const nativeEventCooldownMs = Math.round(
    readNumber(
      rawIntegrations ?? source,
      "nativeEventCooldownMs",
      readNumber(
        source,
        "nativeEventCooldownMs",
        DEFAULT_INTEGRATION_SETTINGS.nativeEventCooldownMs,
        5000,
        60000
      ),
      5000,
      60000
    )
  );

  const nativeSignals = Object.fromEntries(
    NATIVE_OBSIDIAN_SIGNAL_KEYS.map((signal) => [
      signal,
      readBoolean(
        rawNativeSignals ?? rawIntegrations ?? source,
        signal,
        readBoolean(
          rawIntegrations ?? source,
          legacyNativeSignalKey(signal),
          DEFAULT_NATIVE_OBSIDIAN_SIGNAL_SETTINGS[signal]
        )
      )
    ])
  ) as NativeObsidianSignalSettings;

  return {
    apiEnabled,
    protocolHandlerEnabled,
    protocolSayMaxLength,
    protocolDefaultTtlMs,
    nativeEventReactionsEnabled,
    nativeEventCooldownMs,
    nativeSignals
  };
}

function legacyNativeSignalKey(signal: NativeObsidianSignalKey): string {
  return `nativeSignal${signal
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Enabled`;
}

export function normalizePetsidianSettings(raw: unknown): PetsidianSettings {
  if (!isRecord(raw)) {
    return {
      ...DEFAULT_SETTINGS,
      clickActionPool: [...DEFAULT_SETTINGS.clickActionPool],
      importedPets: [],
      windowPosition: null,
      integrations: { ...DEFAULT_INTEGRATION_SETTINGS }
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
    activePetId: readActivePetId(raw, importedPets, catalog),
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
    windowPosition: readWindowPosition(raw),
    integrations: readIntegrations(raw)
  };
}

function serializeImportedPetRecord(pet: ImportedPetRecord): ImportedPetRecord {
  const normalized = normalizeImportedPet(pet);
  if (normalized === null) {
    throw new Error(`Cannot serialize invalid imported pet record: ${pet.id}`);
  }

  if (normalized.spritesheetStoragePath) {
    return {
      id: normalized.id,
      displayName: normalized.displayName,
      description: normalized.description,
      spritesheetStoragePath: normalized.spritesheetStoragePath,
      sourceName: normalized.sourceName ?? null,
      sourceUrl: normalized.sourceUrl ?? null
    };
  }

  return {
    id: normalized.id,
    displayName: normalized.displayName,
    description: normalized.description,
    spritesheetDataUrl: normalized.spritesheetDataUrl ?? null,
    sourceName: normalized.sourceName ?? null,
    sourceUrl: normalized.sourceUrl ?? null
  };
}

export function serializePetsidianSettings(settings: PetsidianSettings): PetsidianSettings {
  return {
    ...settings,
    clickActionPool: [...settings.clickActionPool],
    importedPets: settings.importedPets
      .filter((pet) => pet.spritesheetStoragePath || hasImportedPetSpritesheetData(pet))
      .map(serializeImportedPetRecord),
    windowPosition:
      settings.windowPosition === null
        ? null
        : {
            x: settings.windowPosition.x,
            y: settings.windowPosition.y
          },
    integrations: {
      ...settings.integrations,
      nativeSignals: { ...settings.integrations.nativeSignals }
    }
  };
}

export function getAvailableActions(): readonly PetActionAnimationId[] {
  return PET_ACTION_ANIMATION_IDS;
}

export function mergeIntegrationSettings(
  current: PetsidianIntegrationSettings,
  partial: PartialPetsidianIntegrationSettings
): PetsidianIntegrationSettings {
  return {
    ...current,
    ...partial,
    nativeSignals:
      partial.nativeSignals === undefined
        ? { ...current.nativeSignals }
        : {
            ...current.nativeSignals,
            ...partial.nativeSignals
          }
  };
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
