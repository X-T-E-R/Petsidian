import { Notice, Plugin } from "obsidian";
import { DesktopPetWindow } from "./desktop-pet-window";
import {
  PET_ACTION_LABELS,
  isPetActionAnimationId,
  type PetActionAnimationId
} from "./pet/animation";
import {
  COMPANION_EVENTS,
  COMPANION_EVENT_TYPES,
  isCompanionEventType,
  type CompanionEventType
} from "./pet/events";
import {
  DEFAULT_SETTINGS,
  normalizePetsidianSettings,
  type PetsidianSettings
} from "./pet/settings";
import { PetsidianSettingTab } from "./settings-tab";

export default class PetsidianPlugin extends Plugin {
  settings: PetsidianSettings = {
    ...DEFAULT_SETTINGS,
    clickActionPool: [...DEFAULT_SETTINGS.clickActionPool]
  };

  private desktopPetWindow: DesktopPetWindow | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.desktopPetWindow = new DesktopPetWindow(() => this.settings);

    if (this.settings.visible) {
      await this.showDesktopPetWindow();
    }

    this.addRibbonIcon("paw-print", "Toggle Petsidian pet", () => {
      void this.togglePetVisibility();
    });
    this.addSettingTab(new PetsidianSettingTab(this.app, this));
    this.registerCommands();
  }

  onunload(): void {
    this.desktopPetWindow?.destroy();
    this.desktopPetWindow = null;
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizePetsidianSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizePetsidianSettings(this.settings);
    await this.saveData(this.settings);
    await this.desktopPetWindow?.refreshFromSettings();
  }

  async updateSettings(partial: Partial<PetsidianSettings>): Promise<void> {
    const nextSettings = normalizePetsidianSettings({
      ...this.settings,
      ...partial
    });
    const visibilityChanged = nextSettings.visible !== this.settings.visible;

    this.settings = nextSettings;
    await this.saveData(this.settings);

    if (visibilityChanged) {
      if (this.settings.visible) {
        const shown = await this.showDesktopPetWindow();
        if (!shown) {
          this.settings = normalizePetsidianSettings({
            ...this.settings,
            visible: false
          });
          await this.saveData(this.settings);
        }
      } else {
        this.desktopPetWindow?.hide();
      }
    } else {
      await this.desktopPetWindow?.refreshFromSettings();
    }
  }

  async togglePetVisibility(): Promise<void> {
    await this.setPetVisible(!this.settings.visible);
  }

  async setPetVisible(visible: boolean): Promise<void> {
    await this.updateSettings({ visible });
    new Notice(this.settings.visible ? "Petsidian pet shown" : "Petsidian pet hidden");
  }

  async triggerAction(animationId: PetActionAnimationId, bubbleText?: string): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }
    await this.desktopPetWindow?.playAction(animationId, bubbleText);
  }

  async say(text: string): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }
    await this.desktopPetWindow?.say(text);
  }

  async triggerCompanionEvent(eventType: string): Promise<void> {
    if (!isCompanionEventType(eventType)) {
      new Notice(`Unknown Petsidian event: ${eventType}`);
      return;
    }

    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }

    const eventDefinition = COMPANION_EVENTS[eventType];
    const bubbleText = this.settings.bubblesEnabled ? eventDefinition.defaultBubble : null;
    await this.desktopPetWindow?.playAction(
      eventDefinition.animationId,
      bubbleText,
      this.settings.bubbleTtlMs
    );
  }

  private async showDesktopPetWindow(): Promise<boolean> {
    try {
      await this.desktopPetWindow?.show();
      return true;
    } catch (error) {
      console.error("Petsidian failed to create the desktop pet window", error);
      new Notice(
        "Petsidian requires Obsidian desktop Electron remote APIs to create a detached pet window."
      );
      return false;
    }
  }

  private registerCommands(): void {
    this.addCommand({
      id: "toggle-pet",
      name: "Toggle pet visibility",
      callback: () => {
        void this.togglePetVisibility();
      }
    });

    this.addCommand({
      id: "show-pet",
      name: "Show pet",
      callback: () => {
        void this.setPetVisible(true);
      }
    });

    this.addCommand({
      id: "hide-pet",
      name: "Hide pet",
      callback: () => {
        void this.setPetVisible(false);
      }
    });

    this.addCommand({
      id: "wave",
      name: "Wave",
      callback: () => {
        void this.triggerAction("waving", "Hello from Petsidian!");
      }
    });

    this.addCommand({
      id: "say-sample-message",
      name: "Say sample message",
      callback: () => {
        void this.say("Petsidian is a detached desktop pet.");
      }
    });

    for (const eventType of COMPANION_EVENT_TYPES) {
      this.addCompanionEventCommand(eventType);
    }

    for (const animationId of Object.keys(PET_ACTION_LABELS)) {
      if (isPetActionAnimationId(animationId)) {
        this.addCommand({
          id: `play-${animationId}`,
          name: `Play pet action: ${PET_ACTION_LABELS[animationId]}`,
          callback: () => {
            void this.triggerAction(animationId);
          }
        });
      }
    }
  }

  private addCompanionEventCommand(eventType: CompanionEventType): void {
    this.addCommand({
      id: `trigger-event-${eventType}`,
      name: `Trigger companion event: ${COMPANION_EVENTS[eventType].label}`,
      callback: () => {
        void this.triggerCompanionEvent(eventType);
      }
    });
  }
}
