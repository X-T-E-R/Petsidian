import { Notice, Plugin } from "obsidian";
import { DesktopPetWindow } from "./desktop-pet-window";
import { resolveElectronRuntime } from "./electron-runtime";
import {
  PET_ACTION_LABELS,
  isPetActionAnimationId,
  type PetActionAnimationId
} from "./pet/animation";
import { PET_CATALOG, type ImportedPetRecord } from "./pet/catalog";
import { COMPANION_EVENTS, COMPANION_EVENT_TYPES, isCompanionEventType, type CompanionEventType } from "./pet/events";
import { importLocalPetFromSource, importWebsitePetFromUrl } from "./pet/import";
import { getPetsidianCatalog, normalizePetsidianSettings, type PetsidianSettings } from "./pet/settings";
import { PetsidianSettingTab } from "./settings-tab";

type ObsidianSettingManager = {
  open: () => void;
  openTabById: (id: string) => void;
};

export default class PetsidianPlugin extends Plugin {
  settings: PetsidianSettings = normalizePetsidianSettings(undefined);

  private desktopPetWindow: DesktopPetWindow | null = null;
  private settingsTab: PetsidianSettingTab | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.desktopPetWindow = new DesktopPetWindow({
      getSettings: () => this.settings,
      getCatalog: () => this.getPetCatalog(),
      onOpenSettings: () => this.openSettingsTab(),
      onUpdateSettings: async (partial) => {
        await this.updateSettings(partial);
      }
    });

    if (this.settings.visible) {
      await this.showDesktopPetWindow();
    }

    this.addRibbonIcon("paw-print", "Toggle Petsidian pet", () => {
      void this.togglePetVisibility();
    });

    this.settingsTab = new PetsidianSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
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

  getPetCatalog() {
    return getPetsidianCatalog(this.settings);
  }

  getPetStorageDir(): string | null {
    return "Obsidian plugin data.json (imported sprites are stored as WebP data URLs).";
  }

  async reloadImportedPets(): Promise<void> {
    await this.updateSettings({ importedPets: [...this.settings.importedPets] });
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

    this.settingsTab?.display();
  }

  async togglePetVisibility(): Promise<void> {
    await this.setPetVisible(!this.settings.visible);
  }

  async setPetVisible(visible: boolean): Promise<void> {
    await this.updateSettings({ visible });
    new Notice(this.settings.visible ? "Petsidian pet shown." : "Petsidian pet hidden.");
  }

  async triggerAction(animationId: PetActionAnimationId, bubbleText?: string | null): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }
    await this.desktopPetWindow?.playAction(
      animationId,
      bubbleText ?? (this.settings.eventBubbles ? PET_ACTION_LABELS[animationId] : null),
      this.settings.eventBubbleTtlMs
    );
  }

  async say(text: string, ttlMs?: number | null): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }
    await this.desktopPetWindow?.say(text, ttlMs ?? this.settings.eventBubbleTtlMs);
  }

  async triggerCompanionEvent(eventType: string): Promise<void> {
    if (!isCompanionEventType(eventType)) {
      new Notice(`Unknown Petsidian event: ${eventType}`);
      return;
    }

    if (!this.settings.eventReactions && !this.settings.eventBubbles) {
      return;
    }

    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }

    const eventDefinition = COMPANION_EVENTS[eventType];
    if (!this.settings.eventReactions) {
      if (this.settings.eventBubbles) {
        await this.desktopPetWindow?.say(eventDefinition.defaultBubble, this.settings.eventBubbleTtlMs);
      }
      return;
    }

    await this.desktopPetWindow?.playAction(
      eventDefinition.animationId,
      this.settings.eventBubbles ? eventDefinition.defaultBubble : null,
      this.settings.eventBubbleTtlMs
    );
  }

  async chooseLocalImportSource(): Promise<string | null> {
    try {
      const runtime = resolveElectronRuntime();
      const dialog = runtime.dialog;
      if (dialog === undefined) {
        new Notice("Electron file dialogs are not available in this Obsidian build.");
        return null;
      }
      const result = await dialog.showOpenDialog(null, {
        title: "Select a pet package, pet.json, or spritesheet.webp",
        properties: ["openFile", "openDirectory"],
        filters: [
          { name: "Pet package files", extensions: ["json", "webp"] },
          { name: "All files", extensions: ["*"] }
        ]
      });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    } catch (error) {
      console.error("Petsidian failed to open the local pet import dialog.", error);
      new Notice("Petsidian could not open the local pet import dialog.");
      return null;
    }
  }

  async importLocalPet(source: string): Promise<ImportedPetRecord> {
    const importedPet = await importLocalPetFromSource(source);
    return this.installImportedPet(importedPet, false);
  }

  async importWebsitePet(url: string): Promise<ImportedPetRecord> {
    const importedPet = await importWebsitePetFromUrl(url);
    return this.installImportedPet(importedPet, false);
  }

  async removeImportedPet(petId: string): Promise<void> {
    const importedPets = this.settings.importedPets.filter((pet) => pet.id !== petId);
    const nextActivePetId = this.settings.activePetId === petId ? PET_CATALOG[0].id : this.settings.activePetId;
    await this.updateSettings({
      importedPets,
      activePetId: nextActivePetId
    });
    new Notice("Imported pet removed.");
  }

  openSettingsTab(): void {
    const appWithSettings = this.app as typeof this.app & { setting?: ObsidianSettingManager };
    appWithSettings.setting?.open();
    appWithSettings.setting?.openTabById(this.manifest.id);
    this.settingsTab?.display();
  }

  private async installImportedPet(
    importedPet: ImportedPetRecord,
    force: boolean
  ): Promise<ImportedPetRecord> {
    const installedPet = {
      ...importedPet,
      id: this.reserveImportedPetId(importedPet.id, force)
    };
    const nextImportedPets = this.upsertImportedPet(installedPet);
    await this.updateSettings({
      importedPets: nextImportedPets,
      activePetId: installedPet.id
    });
    new Notice(`Imported ${installedPet.displayName}.`);
    return installedPet;
  }

  private reserveImportedPetId(rawId: string, force: boolean): string {
    const bundledIds = new Set<string>(PET_CATALOG.map((pet) => pet.id));
    const existingIds = new Set<string>(this.settings.importedPets.map((pet) => pet.id));
    let candidate = rawId;
    if (bundledIds.has(candidate)) {
      candidate = `imported-${candidate}`;
    }
    if (!existingIds.has(candidate) || force) {
      return candidate;
    }
    let suffix = 2;
    while (bundledIds.has(`${candidate}-${suffix}`) || existingIds.has(`${candidate}-${suffix}`)) {
      suffix += 1;
    }
    return `${candidate}-${suffix}`;
  }

  private upsertImportedPet(nextPet: ImportedPetRecord): ImportedPetRecord[] {
    const nextPets = this.settings.importedPets.filter((pet) => pet.id !== nextPet.id);
    nextPets.push(nextPet);
    nextPets.sort((left, right) => left.displayName.localeCompare(right.displayName));
    return nextPets;
  }

  private async showDesktopPetWindow(): Promise<boolean> {
    try {
      await this.desktopPetWindow?.show();
      return true;
    } catch (error) {
      console.error("Petsidian failed to create the desktop pet window.", error);
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
      id: "open-settings",
      name: "Open settings",
      callback: () => {
        this.openSettingsTab();
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
