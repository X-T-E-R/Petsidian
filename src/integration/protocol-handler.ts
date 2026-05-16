import { Notice, type ObsidianProtocolData } from "obsidian";
import { isPetActionAnimationId, type PetActionAnimationId } from "../pet/animation";
import { isCompanionEventType } from "../pet/events";
import { type PetsidianSettings } from "../pet/settings";
import { normalizeProtocolText, parseProtocolTtlMs } from "./constants";

type ProtocolHost = {
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

function readVisibilityMode(value: string | "true" | undefined): "show" | "hide" | "toggle" | null {
  if (value === "show" || value === "hide" || value === "toggle") {
    return value;
  }
  return null;
}

export async function handlePetsidianProtocolRequest(
  host: ProtocolHost,
  params: ObsidianProtocolData
): Promise<void> {
  if (!host.settings.integrations.protocolHandlerEnabled) {
    return;
  }

  const bubbleText = normalizeProtocolText(
    params.text,
    host.settings.integrations.protocolSayMaxLength
  );

  if (typeof params.event === "string") {
    if (!isCompanionEventType(params.event)) {
      new Notice(`Unknown Petsidian event: ${params.event}`);
      return;
    }

    await host.triggerCompanionEvent(
      params.event,
      bubbleText === null ? undefined : { bubbleText }
    );
    return;
  }

  const rawPetAction = typeof params.petAction === "string" ? params.petAction : params.animation;
  if (typeof rawPetAction === "string") {
    if (!isPetActionAnimationId(rawPetAction)) {
      new Notice(`Unknown Petsidian action: ${rawPetAction}`);
      return;
    }

    await host.triggerAction(rawPetAction, bubbleText ?? undefined);
    return;
  }

  const visibility = readVisibilityMode(params.visibility);
  if (visibility !== null) {
    if (visibility === "toggle") {
      await host.togglePetVisibility();
      return;
    }

    await host.setPetVisible(visibility === "show");
    return;
  }

  if (bubbleText !== null) {
    await host.say(
      bubbleText,
      parseProtocolTtlMs(params.ttlMs, host.settings.integrations.protocolDefaultTtlMs)
    );
    return;
  }

  new Notice(
    "Petsidian URI requests support event, petAction, visibility, text, and ttlMs parameters only."
  );
}
