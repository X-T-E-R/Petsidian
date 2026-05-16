import { isPetActionAnimationId, type PetActionAnimationId } from "../pet/animation";
import { COMPANION_EVENT_TYPES, isCompanionEventType, type CompanionEventType } from "../pet/events";
import { getAvailableActions, type PetsidianSettings } from "../pet/settings";
import { clampProtocolTtlMs, normalizeProtocolText } from "./constants";

export type PetsidianApiCapabilities = {
  readonly actions: readonly PetActionAnimationId[];
  readonly events: readonly CompanionEventType[];
  readonly uriHandler: boolean;
};

export type PetsidianApiV1 = {
  readonly apiVersion: 1;
  readonly pluginVersion: string;
  readonly capabilities: PetsidianApiCapabilities;
  show(): Promise<boolean>;
  hide(): Promise<void>;
  toggle(): Promise<void>;
  say(text: string, options?: { ttlMs?: number }): Promise<void>;
  triggerAction(
    animationId: PetActionAnimationId,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
  triggerEvent(
    eventType: CompanionEventType,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
};

type PetsidianApiHost = {
  readonly manifest: { version: string };
  readonly settings: PetsidianSettings;
  setPetVisible(visible: boolean): Promise<void>;
  togglePetVisibility(): Promise<void>;
  say(text: string, ttlMs?: number | null): Promise<void>;
  triggerAction(animationId: PetActionAnimationId, bubbleText?: string | null): Promise<void>;
  triggerCompanionEvent(
    eventType: string,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
};

function assertApiEnabled(host: PetsidianApiHost): void {
  if (!host.settings.integrations.apiEnabled) {
    throw new Error("Petsidian integration API is disabled in settings.");
  }
}

function assertActionId(animationId: string): asserts animationId is PetActionAnimationId {
  if (!isPetActionAnimationId(animationId)) {
    throw new Error(`Unknown Petsidian action: ${animationId}`);
  }
}

function assertEventType(eventType: string): asserts eventType is CompanionEventType {
  if (!isCompanionEventType(eventType)) {
    throw new Error(`Unknown Petsidian event: ${eventType}`);
  }
}

function normalizeApiBubbleText(
  value: string | null | undefined,
  maxLength: number
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const normalizedText = normalizeProtocolText(value, maxLength);
  if (normalizedText === null) {
    throw new Error("Petsidian bubbleText must be a non-empty string or null.");
  }
  return normalizedText;
}

export function createPetsidianApiV1(host: PetsidianApiHost): PetsidianApiV1 {
  return {
    get apiVersion() {
      return 1 as const;
    },
    get pluginVersion() {
      return host.manifest.version;
    },
    get capabilities() {
      return {
        actions: Object.freeze([...getAvailableActions()]),
        events: Object.freeze([...COMPANION_EVENT_TYPES]),
        uriHandler: host.settings.integrations.protocolHandlerEnabled
      };
    },
    async show() {
      assertApiEnabled(host);
      await host.setPetVisible(true);
      return host.settings.visible;
    },
    async hide() {
      assertApiEnabled(host);
      await host.setPetVisible(false);
    },
    async toggle() {
      assertApiEnabled(host);
      await host.togglePetVisibility();
    },
    async say(text, options) {
      assertApiEnabled(host);
      const normalizedText = normalizeProtocolText(
        text,
        host.settings.integrations.protocolSayMaxLength
      );
      if (normalizedText === null) {
        throw new Error("Petsidian say() requires a non-empty text string.");
      }

      const ttlMs =
        options?.ttlMs === undefined
          ? null
          : clampProtocolTtlMs(options.ttlMs, host.settings.eventBubbleTtlMs);
      await host.say(normalizedText, ttlMs);
    },
    async triggerAction(animationId, options) {
      assertApiEnabled(host);
      assertActionId(animationId);
      await host.triggerAction(
        animationId,
        normalizeApiBubbleText(
          options?.bubbleText,
          host.settings.integrations.protocolSayMaxLength
        )
      );
    },
    async triggerEvent(eventType, options) {
      assertApiEnabled(host);
      assertEventType(eventType);
      const bubbleText = normalizeApiBubbleText(
        options?.bubbleText,
        host.settings.integrations.protocolSayMaxLength
      );
      await host.triggerCompanionEvent(
        eventType,
        bubbleText === undefined ? undefined : { bubbleText }
      );
    }
  };
}
