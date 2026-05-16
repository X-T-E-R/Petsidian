import { App, Notice } from "obsidian";
import { type CompanionEventType } from "../../pet/events";
import { type PetsidianSettings } from "../../pet/settings";

type OptionalPluginRegistry = {
  plugins?: Record<string, unknown>;
};

type AppWithPluginRegistry = App & {
  plugins?: OptionalPluginRegistry;
};

export type AdapterHost = {
  readonly app: App;
  readonly settings: PetsidianSettings;
  triggerCompanionEvent(
    eventType: string,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
};

export function getRegisteredPlugin(app: App, pluginId: string): unknown {
  const registry = (app as AppWithPluginRegistry).plugins;
  const plugins = registry?.plugins;
  if (plugins === undefined) {
    return undefined;
  }
  return plugins[pluginId];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function countCollection(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (isRecord(value) && typeof value.length === "number" && Number.isFinite(value.length)) {
    return Math.max(0, Math.round(value.length));
  }

  return null;
}

export function clipText(value: string, maxLength = 96): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export async function reportAdapterFeedback(
  host: AdapterHost,
  message: string,
  eventType: CompanionEventType
): Promise<void> {
  const clippedMessage = clipText(message, 120);
  new Notice(clippedMessage);

  if (!host.settings.visible) {
    return;
  }

  await host.triggerCompanionEvent(eventType, {
    bubbleText: clippedMessage
  });
}
