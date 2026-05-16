import { type CompanionEventType } from "../pet/events";
import { type PetsidianSettings } from "../pet/settings";
import {
  NATIVE_OBSIDIAN_SIGNAL_DEFINITIONS,
  type NativeObsidianSignalKey
} from "./native-events";

type RoutedNativeEvent = {
  eventType: CompanionEventType;
  bubbleText: string;
};

type NativeEventRouterHost = {
  readonly settings: PetsidianSettings;
  triggerCompanionEvent(
    eventType: string,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
};

export class NativeEventRouter {
  private readonly timers = new Map<NativeObsidianSignalKey, ReturnType<typeof setTimeout>>();
  private lastTriggeredAt = 0;

  constructor(private readonly host: NativeEventRouterHost) {}

  queue(signal: NativeObsidianSignalKey, nextEvent: RoutedNativeEvent): void {
    if (!this.host.settings.integrations.nativeEventReactionsEnabled) {
      return;
    }

    if (!this.host.settings.integrations.nativeSignals[signal]) {
      return;
    }

    if (!this.host.settings.visible) {
      return;
    }

    const debounceMs = NATIVE_OBSIDIAN_SIGNAL_DEFINITIONS[signal].debounceMs;
    const existingTimer = this.timers.get(signal);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(signal);
      void this.emit(signal, nextEvent);
    }, debounceMs);
    this.timers.set(signal, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private async emit(signal: NativeObsidianSignalKey, nextEvent: RoutedNativeEvent): Promise<void> {
    if (!this.host.settings.integrations.nativeEventReactionsEnabled) {
      return;
    }

    if (!this.host.settings.integrations.nativeSignals[signal]) {
      return;
    }

    if (!this.host.settings.visible) {
      return;
    }

    const now = Date.now();
    if (now - this.lastTriggeredAt < this.host.settings.integrations.nativeEventCooldownMs) {
      return;
    }

    this.lastTriggeredAt = now;
    await this.host.triggerCompanionEvent(nextEvent.eventType, {
      bubbleText: nextEvent.bubbleText
    });
  }
}
