import { Notice, Plugin } from "obsidian";
import { DesktopPetWindow } from "./desktop-pet-window";
import { resolveElectronRuntime, resolveRuntimeRequire } from "./electron-runtime";
import { NativeObsidianEventController } from "./integration/obsidian-events";
import { handlePetsidianProtocolRequest } from "./integration/protocol-handler";
import { createPetsidianApiV1, type PetsidianApiV1 } from "./integration/public-api";
import {
  DESKTOP_PET_PRELOAD_SHA256,
  DESKTOP_PET_PRELOAD_SOURCE
} from "./generated/desktop-pet-preload-source";
import {
  type PetActionAnimationId
} from "./pet/animation";
import { PET_CATALOG, type ImportedPetRecord } from "./pet/catalog";
import { COMPANION_EVENTS, isCompanionEventType } from "./pet/events";
import { importLocalPetFromSource, importWebsitePetFromUrl } from "./pet/import";
import {
  getPetsidianCatalog,
  mergeIntegrationSettings,
  normalizePetsidianSettings,
  serializePetsidianSettings,
  type PetsidianSettings
} from "./pet/settings";
import {
  getLocalizedCompanionEventBubble,
  getLocalizedImportedNotice,
  getLocalizedNotice,
  getLocalizedPetActionLabel,
  getPetUiStrings
} from "./pet/ui-text";
import { PetsidianSettingTab } from "./settings-tab";

type ObsidianSettingManager = {
  open: () => void;
  openTabById: (id: string) => void;
};

type FileSystemAdapterLike = {
  getBasePath: () => string;
};

type NodePathLike = {
  dirname: (pathValue: string) => string;
  resolve: (...parts: readonly string[]) => string;
};

type NodeFsPromisesLike = {
  mkdir: (pathValue: string, options?: { recursive?: boolean }) => Promise<unknown>;
  readFile: (pathValue: string, encoding: "utf8") => Promise<string>;
  writeFile: (pathValue: string, data: string, encoding: "utf8") => Promise<void>;
};

type NodeCryptoLike = {
  createHash: (algorithm: "sha256") => {
    update: (data: string) => {
      digest: (encoding: "hex") => string;
    };
  };
};

const IMPORTED_PETS_DIRNAME = "imported-pets";
const IMPORTED_PET_METADATA_FILENAME = "metadata.json";
const IMPORTED_PET_SPRITESHEET_FILENAME = "spritesheet.webp";
const GENERATED_RUNTIME_DIRNAME = "generated";
const PRELOAD_RUNTIME_DIRNAME = "runtime";
const DESKTOP_PET_PRELOAD_FILENAME = "desktop-pet-preload.js";

function normalizeStoragePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/g, "");
}

function joinStoragePath(...parts: readonly string[]): string {
  return normalizeStoragePath(
    parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join("/")
  );
}

function getParentStoragePath(pathValue: string): string {
  const normalized = normalizeStoragePath(pathValue);
  const lastSlashIndex = normalized.lastIndexOf("/");
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : "";
}

function isFileSystemAdapterLike(value: unknown): value is FileSystemAdapterLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "getBasePath" in value &&
    typeof (value as { getBasePath?: unknown }).getBasePath === "function"
  );
}

function encodeWebpDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return `data:image/webp;base64,${window.btoa(binary)}`;
}

function decodeWebpDataUrl(dataUrl: string): Uint8Array {
  const prefix = "data:image/webp;base64,";
  if (!dataUrl.startsWith(prefix)) {
    throw new Error("Imported pet spritesheet must be a WebP data URL.");
  }
  const binary = window.atob(dataUrl.slice(prefix.length));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default class PetsidianPlugin extends Plugin {
  settings: PetsidianSettings = normalizePetsidianSettings(undefined);
  apiV1: PetsidianApiV1 | undefined = undefined;

  private desktopPetWindow: DesktopPetWindow | null = null;
  private settingsTab: PetsidianSettingTab | null = null;
  private readonly integrationApiV1 = createPetsidianApiV1(this);
  private readonly nativeObsidianEvents = new NativeObsidianEventController(this);

  async onload(): Promise<void> {
    await this.loadSettings();
    this.refreshPublicApiExposure();
    const preloadScriptPath = await this.prepareDesktopPetPreloadScript();

    this.desktopPetWindow = new DesktopPetWindow({
      getSettings: () => this.settings,
      getCatalog: () => this.getPetCatalog(),
      onOpenSettings: () => this.openSettingsTab(),
      onUpdateSettings: async (partial) => {
        await this.updateSettings(partial);
      },
      preloadScriptPath
    });

    this.addRibbonIcon("paw-print", "Toggle Petsidian pet", () => {
      void this.togglePetVisibility();
    });

    this.settingsTab = new PetsidianSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.registerCommands();
    this.registerIntegrationSurfaces();
    this.registerHostWindowCloseCleanup();
    this.app.workspace.onLayoutReady(() => {
      void this.handleLayoutReady();
    });
  }

  onunload(): void {
    this.apiV1 = undefined;
    this.nativeObsidianEvents.destroy();
    this.desktopPetWindow?.destroy();
    this.desktopPetWindow = null;
  }

  async loadSettings(): Promise<void> {
    const rawSettings = await this.loadData();
    let nextSettings = normalizePetsidianSettings(rawSettings);
    const migration = await this.persistImportedPetsToPluginStorage(nextSettings.importedPets);
    nextSettings = normalizePetsidianSettings({
      ...nextSettings,
      importedPets: await this.hydrateImportedPetsFromStorage(migration.importedPets)
    });
    this.settings = nextSettings;

    if (migration.changed || JSON.stringify(serializePetsidianSettings(nextSettings)) !== JSON.stringify(rawSettings ?? null)) {
      await this.saveData(serializePetsidianSettings(nextSettings));
    }
  }

  async saveSettings(): Promise<void> {
    this.settings = normalizePetsidianSettings(this.settings);
    await this.saveData(serializePetsidianSettings(this.settings));
    await this.desktopPetWindow?.refreshFromSettings();
  }

  getPetCatalog() {
    return getPetsidianCatalog(this.settings);
  }

  getPetStorageDir(): string | null {
    return this.getImportedPetsStorageRoot();
  }

  async reloadImportedPets(): Promise<void> {
    await this.updateSettings({
      importedPets: await this.hydrateImportedPetsFromStorage(this.settings.importedPets)
    });
  }

  async updateSettings(partial: Partial<PetsidianSettings>): Promise<void> {
    const nextSettings = normalizePetsidianSettings({
      ...this.settings,
      ...partial,
      integrations:
        partial.integrations === undefined
          ? this.settings.integrations
          : mergeIntegrationSettings(this.settings.integrations, partial.integrations)
    });
    const visibilityChanged = nextSettings.visible !== this.settings.visible;

    this.settings = nextSettings;
    this.refreshPublicApiExposure();
    this.nativeObsidianEvents.refresh();
    await this.saveData(serializePetsidianSettings(this.settings));

    if (visibilityChanged) {
      if (this.settings.visible) {
        await this.ensureVisibleWindowShown();
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
    new Notice(
      getLocalizedNotice(
        this.settings.language,
        this.settings.visible ? "pet-shown" : "pet-hidden"
      )
    );
  }

  async triggerAction(animationId: PetActionAnimationId, bubbleText?: string | null): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }

    const resolvedBubbleText =
      bubbleText === undefined
        ? (
            this.settings.eventBubbles
              ? getLocalizedPetActionLabel(this.settings.language, animationId)
              : null
          )
        : bubbleText;

    await this.desktopPetWindow?.playAction(
      animationId,
      resolvedBubbleText,
      this.settings.eventBubbleTtlMs
    );
  }

  async say(text: string, ttlMs?: number | null): Promise<void> {
    if (!this.settings.visible) {
      await this.updateSettings({ visible: true });
    }
    await this.desktopPetWindow?.say(text, ttlMs ?? this.settings.eventBubbleTtlMs);
  }

  async triggerCompanionEvent(
    eventType: string,
    options?: { bubbleText?: string | null }
  ): Promise<void> {
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
    const bubbleText =
      options?.bubbleText === undefined
        ? getLocalizedCompanionEventBubble(this.settings.language, eventType)
        : options.bubbleText;
    if (!this.settings.eventReactions) {
      if (this.settings.eventBubbles && bubbleText !== null) {
        await this.desktopPetWindow?.say(bubbleText, this.settings.eventBubbleTtlMs);
      }
      return;
    }

    await this.desktopPetWindow?.playAction(
      eventDefinition.animationId,
      this.settings.eventBubbles ? bubbleText : null,
      this.settings.eventBubbleTtlMs
    );
  }

  async chooseLocalImportSource(): Promise<string | null> {
    try {
      const runtime = resolveElectronRuntime();
      const dialog = runtime.dialog;
      if (dialog === undefined) {
        new Notice(getLocalizedNotice(this.settings.language, "dialog-unavailable"));
        return null;
      }
      const result = await dialog.showOpenDialog(null, {
        title: "Select a Codex pet package, pet.json, or supported image file",
        properties: ["openFile", "openDirectory"],
        filters: [
          { name: "Codex pet files", extensions: ["json", "webp", "png", "jpg", "jpeg", "gif"] },
          { name: "All files", extensions: ["*"] }
        ]
      });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    } catch (error) {
      console.error("Petsidian failed to open the local pet import dialog.", error);
      new Notice(getLocalizedNotice(this.settings.language, "dialog-open-failed"));
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
    const petToRemove = this.settings.importedPets.find((pet) => pet.id === petId) ?? null;
    const importedPets = this.settings.importedPets.filter((pet) => pet.id !== petId);
    const nextActivePetId = this.settings.activePetId === petId ? PET_CATALOG[0].id : this.settings.activePetId;
    if (petToRemove?.spritesheetStoragePath) {
      await this.removeImportedPetStorage(petToRemove.spritesheetStoragePath);
    }
    await this.updateSettings({
      importedPets,
      activePetId: nextActivePetId
    });
    new Notice(getLocalizedNotice(this.settings.language, "import-removed"));
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
    const reservedId = this.reserveImportedPetId(importedPet.id, force);
    const storedPet = await this.storeImportedPet({
      ...importedPet,
      id: reservedId
    });
    const nextImportedPets = this.upsertImportedPet(storedPet);
    await this.updateSettings({
      importedPets: nextImportedPets,
      activePetId: storedPet.id
    });
    new Notice(getLocalizedImportedNotice(this.settings.language, storedPet.displayName));
    return storedPet;
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

  private getPluginDataDir(): string {
    return normalizeStoragePath(
      this.manifest.dir ?? joinStoragePath(this.app.vault.configDir, "plugins", this.manifest.id)
    );
  }

  private getImportedPetsStorageRoot(): string {
    return joinStoragePath(this.getPluginDataDir(), IMPORTED_PETS_DIRNAME);
  }

  private async prepareDesktopPetPreloadScript(): Promise<string | null> {
    const preloadScriptPath = this.getDesktopPetPreloadScriptPath();
    if (preloadScriptPath === null) {
      return null;
    }

    try {
      const runtimeRequire = resolveRuntimeRequire();
      const nodeFs = runtimeRequire("node:fs/promises") as NodeFsPromisesLike;
      const nodePath = runtimeRequire("node:path") as NodePathLike;
      await nodeFs.mkdir(nodePath.dirname(preloadScriptPath), { recursive: true });

      let existingHash: string | null = null;
      try {
        const existingSource = await nodeFs.readFile(preloadScriptPath, "utf8");
        existingHash = this.hashDesktopPetPreloadSource(existingSource);
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
          throw error;
        }
      }

      if (existingHash !== DESKTOP_PET_PRELOAD_SHA256) {
        await nodeFs.writeFile(preloadScriptPath, DESKTOP_PET_PRELOAD_SOURCE, "utf8");
      }

      return preloadScriptPath;
    } catch (error) {
      console.error(
        "Petsidian failed to prepare the generated desktop pet preload bridge. Smooth native drag will fall back to host polling.",
        error
      );
      return null;
    }
  }

  private hashDesktopPetPreloadSource(source: string): string {
    const runtimeRequire = resolveRuntimeRequire();
    const nodeCrypto = runtimeRequire("node:crypto") as NodeCryptoLike;
    return nodeCrypto.createHash("sha256").update(source).digest("hex");
  }

  private getDesktopPetPreloadScriptPath(): string | null {
    if (!isFileSystemAdapterLike(this.app.vault.adapter)) {
      return null;
    }

    try {
      const runtimeRequire = resolveRuntimeRequire();
      const nodePath = runtimeRequire("node:path") as NodePathLike;
      const pluginDir = this.manifest.dir ?? joinStoragePath(this.app.vault.configDir, "plugins", this.manifest.id);
      return nodePath.resolve(
        this.app.vault.adapter.getBasePath(),
        pluginDir,
        GENERATED_RUNTIME_DIRNAME,
        PRELOAD_RUNTIME_DIRNAME,
        DESKTOP_PET_PRELOAD_FILENAME
      );
    } catch {
      return null;
    }
  }

  private async ensureStorageDirectoryExists(pathValue: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const normalizedPath = normalizeStoragePath(pathValue);
    if (normalizedPath.length === 0 || (await adapter.exists(normalizedPath))) {
      return;
    }

    const parentPath = getParentStoragePath(normalizedPath);
    if (parentPath.length > 0 && parentPath !== normalizedPath) {
      await this.ensureStorageDirectoryExists(parentPath);
    }

    if (!(await adapter.exists(normalizedPath))) {
      await adapter.mkdir(normalizedPath);
    }
  }

  private createImportedPetStorageDir(petId: string): string {
    const importKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return joinStoragePath(this.getImportedPetsStorageRoot(), petId, importKey);
  }

  private async storeImportedPet(importedPet: ImportedPetRecord): Promise<ImportedPetRecord> {
    if (!importedPet.spritesheetDataUrl) {
      throw new Error(`Imported pet '${importedPet.id}' is missing spritesheet data.`);
    }

    const adapter = this.app.vault.adapter;
    const importDir = this.createImportedPetStorageDir(importedPet.id);
    const spritesheetStoragePath = joinStoragePath(importDir, IMPORTED_PET_SPRITESHEET_FILENAME);
    const metadataPath = joinStoragePath(importDir, IMPORTED_PET_METADATA_FILENAME);
    const spritesheetBytes = decodeWebpDataUrl(importedPet.spritesheetDataUrl);
    const exactBytes = spritesheetBytes.slice();

    await this.ensureStorageDirectoryExists(importDir);
    await adapter.writeBinary(
      spritesheetStoragePath,
      exactBytes.buffer as ArrayBuffer
    );
    await adapter.write(
      metadataPath,
      JSON.stringify(
        {
          id: importedPet.id,
          displayName: importedPet.displayName,
          description: importedPet.description,
          sourceName: importedPet.sourceName ?? null,
          sourceUrl: importedPet.sourceUrl ?? null
        },
        null,
        2
      )
    );

    return {
      ...importedPet,
      spritesheetStoragePath
    };
  }

  private async persistImportedPetsToPluginStorage(
    importedPets: readonly ImportedPetRecord[]
  ): Promise<{ importedPets: ImportedPetRecord[]; changed: boolean }> {
    const nextImportedPets: ImportedPetRecord[] = [];
    let changed = false;

    for (const importedPet of importedPets) {
      if (importedPet.spritesheetStoragePath) {
        nextImportedPets.push(importedPet);
        continue;
      }
      if (!importedPet.spritesheetDataUrl) {
        changed = true;
        continue;
      }
      nextImportedPets.push(await this.storeImportedPet(importedPet));
      changed = true;
    }

    return {
      importedPets: nextImportedPets,
      changed
    };
  }

  private async hydrateImportedPetsFromStorage(
    importedPets: readonly ImportedPetRecord[]
  ): Promise<ImportedPetRecord[]> {
    const adapter = this.app.vault.adapter;
    const nextImportedPets: ImportedPetRecord[] = [];

    for (const importedPet of importedPets) {
      if (!importedPet.spritesheetStoragePath) {
        if (importedPet.spritesheetDataUrl) {
          nextImportedPets.push(importedPet);
        }
        continue;
      }

      try {
        const bytes = await adapter.readBinary(importedPet.spritesheetStoragePath);
        nextImportedPets.push({
          ...importedPet,
          spritesheetDataUrl: encodeWebpDataUrl(new Uint8Array(bytes))
        });
      } catch (error) {
        console.error(
          `Petsidian could not reload imported pet '${importedPet.id}' from ${importedPet.spritesheetStoragePath}.`,
          error
        );
        if (importedPet.spritesheetDataUrl) {
          nextImportedPets.push(importedPet);
        }
      }
    }

    return nextImportedPets;
  }

  private async removeImportedPetStorage(spritesheetStoragePath: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    const importDir = getParentStoragePath(spritesheetStoragePath);
    if (importDir.length === 0) {
      if (await adapter.exists(spritesheetStoragePath)) {
        await adapter.remove(spritesheetStoragePath);
      }
      return;
    }

    if (await adapter.exists(importDir)) {
      await adapter.rmdir(importDir, true);
    }
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

  private async ensureVisibleWindowShown(): Promise<boolean> {
    const shown = await this.showDesktopPetWindow();
    if (shown) {
      return true;
    }

    this.settings = normalizePetsidianSettings({
      ...this.settings,
      visible: false
    });
    await this.saveData(serializePetsidianSettings(this.settings));
    this.settingsTab?.display();
    return false;
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
        void this.triggerAction("waving", getPetUiStrings(this.settings.language).waveBubble);
      }
    });
  }

  private refreshPublicApiExposure(): void {
    this.apiV1 = this.settings.integrations.apiEnabled ? this.integrationApiV1 : undefined;
  }

  private registerIntegrationSurfaces(): void {
    this.registerObsidianProtocolHandler("petsidian", (params) => {
      void handlePetsidianProtocolRequest(this, params);
    });
  }

  private registerHostWindowCloseCleanup(): void {
    try {
      const runtime = resolveElectronRuntime();
      const hostWindow = runtime.getCurrentWindow?.();
      if (hostWindow === undefined || typeof hostWindow.on !== "function") {
        return;
      }

      const closeDetachedPet = () => {
        this.desktopPetWindow?.destroy();
        this.desktopPetWindow = null;
      };

      hostWindow.on("close", closeDetachedPet);
      this.register(() => {
        hostWindow.removeListener?.("close", closeDetachedPet);
      });
    } catch {
      // Optional Electron host-window cleanup path only.
    }
  }

  private async handleLayoutReady(): Promise<void> {
    this.nativeObsidianEvents.onLayoutReady();
    if (this.settings.visible) {
      await this.ensureVisibleWindowShown();
    }
  }
}
