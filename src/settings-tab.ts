import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import {
  NATIVE_OBSIDIAN_SIGNAL_DEFINITIONS,
  NATIVE_OBSIDIAN_SIGNAL_KEYS
} from "./integration/native-events";
import type PetsidianPlugin from "./main";
import { isPetActionAnimationId } from "./pet/animation";
import { PET_CATALOG } from "./pet/catalog";
import { COMPANION_EVENT_TYPES, type CompanionEventType } from "./pet/events";
import {
  getAvailableActions,
  getAvailableIdleActions,
  getBubbleStyles,
  type PartialPetsidianIntegrationSettings
} from "./pet/settings";
import {
  getLocalizedBubbleStyleLabel,
  getLocalizedCompanionEventLabel,
  getLocalizedNativeSignalUi,
  getLocalizedPetActionLabel,
  getSettingsSections,
  getSettingsUiStrings,
  type SettingsSectionId,
  type SettingsUiStrings
} from "./pet/ui-text";

export class PetsidianSettingTab extends PluginSettingTab {
  private readonly plugin: PetsidianPlugin;
  private localImportSource = "";
  private websiteImportUrl = "";
  private activeSection: SettingsSectionId = "window";
  private previewEventType: CompanionEventType = COMPANION_EVENT_TYPES[0];

  constructor(app: App, plugin: PetsidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const strings = getSettingsUiStrings(settings.language);
    const sections = getSettingsSections(settings.language);
    containerEl.empty();
    containerEl.addClass("petsidian-settings");

    const activeSection =
      sections.find((section) => section.id === this.activeSection) ?? sections[0]!;

    new Setting(containerEl).setName(strings.title).setHeading();
    containerEl.createEl("p", { text: strings.intro });

    this.renderSectionNavigation(containerEl, sections);

    containerEl.createEl("p", {
      cls: "petsidian-section-copy",
      text: activeSection.description
    });

    switch (activeSection.id) {
      case "window":
        this.renderWindowSection(containerEl, strings);
        break;
      case "pet":
        this.renderPetSection(containerEl, strings);
        break;
      case "import":
        this.renderImportSection(containerEl, strings);
        break;
      case "behavior":
        this.renderBehaviorSection(containerEl, strings);
        break;
      case "speech":
        this.renderBubbleSection(containerEl, strings);
        break;
      case "integrations":
        this.renderIntegrationsSection(containerEl, strings);
        break;
      case "about":
        this.renderAboutSection(containerEl, strings);
        break;
    }
  }

  private renderSectionNavigation(
    containerEl: HTMLElement,
    sections: readonly { id: SettingsSectionId; label: string }[]
  ): void {
    const navEl = containerEl.createDiv({ cls: "petsidian-settings-nav" });
    for (const section of sections) {
      const buttonEl = navEl.createEl("button", {
        cls: "petsidian-settings-nav-button",
        text: section.label,
        type: "button"
      });
      if (section.id === this.activeSection) {
        buttonEl.addClass("is-active");
      }
      buttonEl.addEventListener("click", () => {
        this.activeSection = section.id;
        this.display();
      });
    }
  }

  private renderWindowSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    const settings = this.plugin.settings;

    new Setting(containerEl).setName(strings.window.heading).setHeading();

    new Setting(containerEl)
      .setName(strings.window.showPetName)
      .setDesc(strings.window.showPetDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.visible).onChange(async (visible) => {
          await this.plugin.updateSettings({ visible });
        })
      );

    new Setting(containerEl)
      .setName(strings.window.alwaysOnTopName)
      .setDesc(strings.window.alwaysOnTopDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.alwaysOnTop).onChange(async (alwaysOnTop) => {
          await this.plugin.updateSettings({ alwaysOnTop });
        })
      );

    new Setting(containerEl)
      .setName(strings.window.skipTaskbarName)
      .setDesc(strings.window.skipTaskbarDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.skipTaskbar).onChange(async (skipTaskbar) => {
          await this.plugin.updateSettings({ skipTaskbar });
        })
      );

    new Setting(containerEl)
      .setName(strings.window.languageName)
      .setDesc(strings.window.languageDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("en", strings.window.languageEnglish)
          .addOption("zh-CN", strings.window.languageChinese)
          .setValue(settings.language)
          .onChange(async (language) => {
            await this.plugin.updateSettings({ language: language === "zh-CN" ? "zh-CN" : "en" });
          })
      );
  }

  private renderPetSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    const settings = this.plugin.settings;
    const catalog = this.plugin.getPetCatalog();

    new Setting(containerEl).setName(strings.pet.heading).setHeading();

    new Setting(containerEl)
      .setName(strings.pet.activePetName)
      .setDesc(strings.pet.activePetDesc)
      .addDropdown((dropdown) => {
        for (const pet of catalog) {
          dropdown.addOption(
            pet.id,
            pet.imported ? `${pet.displayName} (${strings.importedSuffix})` : pet.displayName
          );
        }
        return dropdown.setValue(settings.activePetId).onChange(async (value) => {
          await this.plugin.updateSettings({ activePetId: value });
        });
      });

    if (settings.importedPets.length === 0) {
      containerEl.createEl("p", {
        cls: "petsidian-settings-status",
        text: strings.common.noImportedPets
      });
      return;
    }

    const importedPetStorageDir = this.plugin.getPetStorageDir();
    containerEl.createEl("p", {
      cls: "petsidian-settings-status",
      text:
        importedPetStorageDir === null
          ? strings.common.importedPetsStorage
          : `${strings.common.importedPetsStorage} ${importedPetStorageDir}`
    });

    for (const importedPet of settings.importedPets) {
      new Setting(containerEl)
        .setName(importedPet.displayName)
        .setDesc(importedPet.sourceUrl ?? importedPet.description)
        .addButton((button) =>
          button.setButtonText(strings.common.use).onClick(async () => {
            await this.plugin.updateSettings({ activePetId: importedPet.id });
            new Notice(`${strings.notices.activePetSetPrefix}${importedPet.displayName}`);
          })
        )
        .addButton((button) =>
          button
            .setButtonText(strings.common.remove)
            .setWarning()
            .onClick(async () => {
              await this.plugin.removeImportedPet(importedPet.id);
            })
        );
    }
  }

  private renderImportSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    new Setting(containerEl).setName(strings.import.heading).setHeading();

    const workflowEl = containerEl.createDiv({ cls: "petsidian-import-flow" });

    const localCard = this.createImportCard(
      workflowEl,
      strings.import.localTitle,
      strings.import.localCopy
    );

    const localSourceSetting = new Setting(localCard)
      .setName(strings.import.localSourceName)
      .setDesc(strings.import.localSourceDesc)
      .addText((text) => {
        text
          .setPlaceholder(strings.import.localSourcePlaceholder)
          .setValue(this.localImportSource)
          .onChange((value) => {
            this.localImportSource = value;
          });
        text.inputEl.addClass("petsidian-settings-input");
      })
      .addButton((button) =>
        button.setButtonText(strings.common.browse).onClick(async () => {
          const selectedPath = await this.plugin.chooseLocalImportSource();
          if (selectedPath !== null) {
            this.localImportSource = selectedPath;
            this.display();
          }
        })
      )
      .addButton((button) =>
        button.setCta().setButtonText(strings.common.import).onClick(async () => {
          if (this.localImportSource.trim().length === 0) {
            new Notice(strings.notices.localPathRequired);
            return;
          }
          try {
            await this.plugin.importLocalPet(this.localImportSource);
            this.localImportSource = "";
            this.display();
          } catch (error) {
            console.error("Petsidian local import failed.", error);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        })
      );
    localSourceSetting.settingEl.addClass("petsidian-import-source-setting");

    localCard.createEl("p", {
      cls: "petsidian-settings-status",
      text: this.localImportSource.trim().length > 0
        ? `${strings.common.selectedSourceLabel}: ${this.localImportSource}`
        : strings.common.noSourceSelected
    });

    localCard.createEl("p", {
      cls: "petsidian-import-subtitle",
      text: strings.import.localAcceptedTitle
    });
    const localSourceList = localCard.createEl("ul", { cls: "petsidian-import-list" });
    for (const item of strings.import.localAcceptedList) {
      localSourceList.createEl("li", { text: item });
    }

    const websiteCard = this.createImportCard(
      workflowEl,
      strings.import.websiteTitle,
      strings.import.websiteCopy
    );
    const websiteLinksEl = websiteCard.createDiv({ cls: "petsidian-link-row" });
    websiteLinksEl.createEl("span", { text: strings.common.supportedSourcesLabel });
    this.createExternalShortcut(
      websiteLinksEl,
      strings.import.petdex,
      "https://petdex.crafter.run/"
    );
    this.createExternalShortcut(
      websiteLinksEl,
      strings.import.codexPets,
      "https://codex-pets.net/"
    );

    const websiteSourceSetting = new Setting(websiteCard)
      .setName(strings.import.websiteSourceName)
      .setDesc(strings.import.websiteSourceDesc)
      .addText((text) => {
        text
          .setPlaceholder(strings.import.websiteSourcePlaceholder)
          .setValue(this.websiteImportUrl)
          .onChange((value) => {
            this.websiteImportUrl = value;
          });
        text.inputEl.addClass("petsidian-settings-input");
      })
      .addButton((button) =>
        button.setCta().setButtonText(strings.common.import).onClick(async () => {
          if (this.websiteImportUrl.trim().length === 0) {
            new Notice(strings.notices.websiteUrlRequired);
            return;
          }
          try {
            await this.plugin.importWebsitePet(this.websiteImportUrl);
            this.websiteImportUrl = "";
            this.display();
          } catch (error) {
            console.error("Petsidian website import failed.", error);
            new Notice(error instanceof Error ? error.message : String(error));
          }
        })
      );
    websiteSourceSetting.settingEl.addClass("petsidian-import-source-setting");

    const compatibilityCard = this.createImportCard(
      workflowEl,
      strings.import.compatibilityTitle,
      strings.import.compatibilityCopy,
      true
    );
    const compatibilityList = compatibilityCard.createEl("ul", { cls: "petsidian-import-list" });
    for (const item of strings.import.compatibilityNotes) {
      compatibilityList.createEl("li", { text: item });
    }
  }

  private renderBehaviorSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    const settings = this.plugin.settings;
    const language = settings.language;

    new Setting(containerEl).setName(strings.behavior.heading).setHeading();

    new Setting(containerEl)
      .setName(strings.behavior.scaleName)
      .setDesc(strings.behavior.scaleDesc)
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 2, 0.05)
          .setValue(settings.scale)
          .setDynamicTooltip()
          .onChange(async (scale) => {
            await this.plugin.updateSettings({ scale });
          })
      );

    new Setting(containerEl)
      .setName(strings.behavior.reducedMotionName)
      .setDesc(strings.behavior.reducedMotionDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.reducedMotion).onChange(async (reducedMotion) => {
          await this.plugin.updateSettings({ reducedMotion });
        })
      );

    new Setting(containerEl)
      .setName(strings.behavior.autonomousWalkingName)
      .setDesc(strings.behavior.autonomousWalkingDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.autonomousWalking).onChange(async (autonomousWalking) => {
          await this.plugin.updateSettings({ autonomousWalking });
        })
      );

    new Setting(containerEl)
      .setName(strings.behavior.walkingSpeedName)
      .setDesc(strings.behavior.walkingSpeedDesc)
      .addSlider((slider) =>
        slider
          .setLimits(10, 160, 5)
          .setValue(settings.walkingSpeedPx)
          .setDynamicTooltip()
          .onChange(async (walkingSpeedPx) => {
            await this.plugin.updateSettings({ walkingSpeedPx });
          })
      );

    new Setting(containerEl)
      .setName(strings.behavior.hoverPauseName)
      .setDesc(strings.behavior.hoverPauseDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.hoverPause).onChange(async (hoverPause) => {
          await this.plugin.updateSettings({ hoverPause });
        })
      );

    new Setting(containerEl)
      .setName(strings.behavior.idleSelfPlayName)
      .setDesc(strings.behavior.idleSelfPlayDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.idleSelfPlay).onChange(async (idleSelfPlay) => {
          await this.plugin.updateSettings({ idleSelfPlay });
        })
      );

    new Setting(containerEl)
      .setName(strings.behavior.idleThresholdName)
      .setDesc(strings.behavior.idleThresholdDesc)
      .addSlider((slider) =>
        slider
          .setLimits(5000, 180000, 5000)
          .setValue(settings.idleThresholdMs)
          .setDynamicTooltip()
          .onChange(async (idleThresholdMs) => {
            await this.plugin.updateSettings({ idleThresholdMs });
          })
      );

    new Setting(containerEl)
      .setName(strings.behavior.idleActionFrequencyName)
      .setDesc(strings.behavior.idleActionFrequencyDesc)
      .addSlider((slider) =>
        slider
          .setLimits(5000, 180000, 5000)
          .setValue(settings.idleActionFrequencyMs)
          .setDynamicTooltip()
          .onChange(async (idleActionFrequencyMs) => {
            await this.plugin.updateSettings({ idleActionFrequencyMs });
          })
      );

    new Setting(containerEl)
      .setName(strings.behavior.idleActionName)
      .setDesc(strings.behavior.idleActionDesc)
      .addDropdown((dropdown) => {
        for (const action of getAvailableIdleActions()) {
          const label =
            action === "random"
              ? strings.behavior.idleRandom
              : action === "active-action"
                ? strings.behavior.idleActiveAction
                : isPetActionAnimationId(action)
                  ? getLocalizedPetActionLabel(language, action)
                  : action;
          dropdown.addOption(action, label);
        }
        return dropdown.setValue(settings.idleAction).onChange(async (idleAction) => {
          await this.plugin.updateSettings({ idleAction: idleAction as typeof settings.idleAction });
        });
      });

    new Setting(containerEl)
      .setName(strings.behavior.clickActionModeName)
      .setDesc(strings.behavior.clickActionModeDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("fixed", strings.behavior.clickActionModeFixed)
          .addOption("random", strings.behavior.clickActionModeRandom)
          .setValue(settings.clickActionMode)
          .onChange(async (clickActionMode) => {
            await this.plugin.updateSettings({
              clickActionMode: clickActionMode === "fixed" ? "fixed" : "random"
            });
          })
      );

    new Setting(containerEl)
      .setName(strings.behavior.fixedClickActionName)
      .setDesc(strings.behavior.fixedClickActionDesc)
      .addDropdown((dropdown) => {
        for (const action of getAvailableActions()) {
          dropdown.addOption(action, getLocalizedPetActionLabel(language, action));
        }
        return dropdown.setValue(settings.clickAction).onChange(async (value) => {
          if (isPetActionAnimationId(value)) {
            await this.plugin.updateSettings({ clickAction: value });
          }
        });
      })
      .addButton((button) =>
        button.setButtonText(strings.common.preview).onClick(async () => {
          await this.plugin.triggerAction(settings.clickAction);
        })
      );

    containerEl.createEl("p", { text: strings.behavior.randomActionPoolLabel });
    for (const action of getAvailableActions()) {
      new Setting(containerEl)
        .setName(getLocalizedPetActionLabel(language, action))
        .setDesc(strings.behavior.randomActionPoolItemDesc)
        .addToggle((toggle) =>
          toggle.setValue(settings.clickActionPool.includes(action)).onChange(async (enabled) => {
            const nextPool = enabled
              ? [...new Set([...settings.clickActionPool, action])]
              : settings.clickActionPool.filter((entry) => entry !== action);
            await this.plugin.updateSettings({ clickActionPool: nextPool });
          })
        );
    }

    new Setting(containerEl)
      .setName(strings.behavior.eventReactionsName)
      .setDesc(strings.behavior.eventReactionsDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.eventReactions).onChange(async (eventReactions) => {
          await this.plugin.updateSettings({ eventReactions });
        })
      );

    new Setting(containerEl)
      .setName(strings.behavior.previewCompanionEventsName)
      .setDesc(strings.behavior.previewCompanionEventsDesc)
      .addDropdown((dropdown) => {
        for (const eventType of COMPANION_EVENT_TYPES) {
          dropdown.addOption(eventType, getLocalizedCompanionEventLabel(language, eventType));
        }
        return dropdown.setValue(this.previewEventType).onChange((eventType) => {
          this.previewEventType = eventType as CompanionEventType;
        });
      })
      .addButton((button) =>
        button.setButtonText(strings.common.trigger).onClick(() => {
          void this.plugin.triggerCompanionEvent(this.previewEventType);
        })
      );
  }

  private renderBubbleSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    const settings = this.plugin.settings;
    const language = settings.language;

    new Setting(containerEl).setName(strings.speech.heading).setHeading();

    new Setting(containerEl)
      .setName(strings.speech.eventBubblesName)
      .setDesc(strings.speech.eventBubblesDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.eventBubbles).onChange(async (eventBubbles) => {
          await this.plugin.updateSettings({ eventBubbles });
        })
      );

    new Setting(containerEl).setName(strings.speech.bubbleAppearanceHeading).setHeading();

    new Setting(containerEl)
      .setName(strings.speech.bubbleStyleName)
      .setDesc(strings.speech.bubbleStyleDesc)
      .addDropdown((dropdown) => {
        for (const style of getBubbleStyles()) {
          dropdown.addOption(style, getLocalizedBubbleStyleLabel(language, style));
        }
        return dropdown.setValue(settings.bubbleStyle).onChange(async (bubbleStyle) => {
          await this.plugin.updateSettings({ bubbleStyle: bubbleStyle as typeof settings.bubbleStyle });
        });
      });

    new Setting(containerEl)
      .setName(strings.speech.bubbleDurationName)
      .setDesc(strings.speech.bubbleDurationDesc)
      .addSlider((slider) =>
        slider
          .setLimits(1000, 15000, 500)
          .setValue(settings.eventBubbleTtlMs)
          .setDynamicTooltip()
          .onChange(async (eventBubbleTtlMs) => {
            await this.plugin.updateSettings({ eventBubbleTtlMs });
          })
      );

    new Setting(containerEl)
      .setName(strings.speech.bubbleFontFamilyName)
      .setDesc(strings.speech.bubbleFontFamilyDesc)
      .addText((text) =>
        text
          .setPlaceholder(strings.speech.bubbleFontFamilyPlaceholder)
          .setValue(settings.bubbleFontFamily)
          .onChange(async (bubbleFontFamily) => {
            await this.plugin.updateSettings({ bubbleFontFamily });
          })
      );

    new Setting(containerEl)
      .setName(strings.speech.bubbleFontSizeName)
      .setDesc(strings.speech.bubbleFontSizeDesc)
      .addSlider((slider) =>
        slider
          .setLimits(10, 28, 1)
          .setValue(settings.bubbleFontSizePx)
          .setDynamicTooltip()
          .onChange(async (bubbleFontSizePx) => {
            await this.plugin.updateSettings({ bubbleFontSizePx });
          })
      );

    new Setting(containerEl)
      .setName(strings.speech.bubbleMaxWidthName)
      .setDesc(strings.speech.bubbleMaxWidthDesc)
      .addSlider((slider) =>
        slider
          .setLimits(180, 520, 4)
          .setValue(settings.bubbleMaxWidthPx)
          .setDynamicTooltip()
          .onChange(async (bubbleMaxWidthPx) => {
            await this.plugin.updateSettings({ bubbleMaxWidthPx });
          })
      )
      .addButton((button) =>
        button.setButtonText(strings.common.preview).onClick(() => {
          void this.plugin.say(strings.speech.bubblePreviewText);
        })
      );
  }

  private renderIntegrationsSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    const settings = this.plugin.settings;
    const language = settings.language;

    new Setting(containerEl).setName(strings.integrations.heading).setHeading();
    containerEl.createEl("p", { text: strings.integrations.intro });

    const updateIntegrations = async (
      partial: PartialPetsidianIntegrationSettings
    ): Promise<void> => {
      await this.plugin.updateSettings({ integrations: partial as typeof settings.integrations });
    };

    new Setting(containerEl)
      .setName(strings.integrations.apiEnabledName)
      .setDesc(strings.integrations.apiEnabledDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.integrations.apiEnabled).onChange(async (apiEnabled) => {
          await updateIntegrations({ apiEnabled });
        })
      );

    new Setting(containerEl)
      .setName(strings.integrations.protocolEnabledName)
      .setDesc(strings.integrations.protocolEnabledDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(settings.integrations.protocolHandlerEnabled)
          .onChange(async (protocolHandlerEnabled) => {
            await updateIntegrations({ protocolHandlerEnabled });
          })
      );

    new Setting(containerEl)
      .setName(strings.integrations.protocolSayMaxLengthName)
      .setDesc(strings.integrations.protocolSayMaxLengthDesc)
      .addSlider((slider) =>
        slider
          .setLimits(32, 1000, 8)
          .setValue(settings.integrations.protocolSayMaxLength)
          .setDynamicTooltip()
          .onChange(async (protocolSayMaxLength) => {
            await updateIntegrations({ protocolSayMaxLength });
          })
      );

    new Setting(containerEl)
      .setName(strings.integrations.protocolDefaultTtlName)
      .setDesc(strings.integrations.protocolDefaultTtlDesc)
      .addSlider((slider) =>
        slider
          .setLimits(500, 60000, 500)
          .setValue(settings.integrations.protocolDefaultTtlMs)
          .setDynamicTooltip()
          .onChange(async (protocolDefaultTtlMs) => {
            await updateIntegrations({ protocolDefaultTtlMs });
          })
      );

    new Setting(containerEl).setName(strings.integrations.nativeHeading).setHeading();

    new Setting(containerEl)
      .setName(strings.integrations.nativeEnabledName)
      .setDesc(strings.integrations.nativeEnabledDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(settings.integrations.nativeEventReactionsEnabled)
          .onChange(async (nativeEventReactionsEnabled) => {
            await updateIntegrations({ nativeEventReactionsEnabled });
          })
      );

    new Setting(containerEl)
      .setName(strings.integrations.nativeCooldownName)
      .setDesc(strings.integrations.nativeCooldownDesc)
      .addSlider((slider) =>
        slider
          .setLimits(5000, 60000, 1000)
          .setValue(settings.integrations.nativeEventCooldownMs)
          .setDynamicTooltip()
          .onChange(async (nativeEventCooldownMs) => {
            await updateIntegrations({ nativeEventCooldownMs });
          })
      );

    containerEl.createEl("p", { text: strings.integrations.nativeSignalsIntro });

    for (const signal of NATIVE_OBSIDIAN_SIGNAL_KEYS) {
      const signalUi = getLocalizedNativeSignalUi(language, signal);
      const debounceMs = NATIVE_OBSIDIAN_SIGNAL_DEFINITIONS[signal].debounceMs;
      new Setting(containerEl)
        .setName(signalUi.label)
        .setDesc(
          `${signalUi.description} ${strings.common.debounceLabel}: ${debounceMs} ${strings.common.milliseconds}`
        )
        .addToggle((toggle) =>
          toggle
            .setValue(settings.integrations.nativeSignals[signal])
            .onChange(async (enabled) => {
              await updateIntegrations({
                nativeSignals: {
                  [signal]: enabled
                }
              });
            })
        );
    }
  }

  private renderAboutSection(containerEl: HTMLElement, strings: SettingsUiStrings): void {
    new Setting(containerEl).setName(strings.about.heading).setHeading();

    const notesEl = containerEl.createEl("ul", { cls: "petsidian-notes petsidian-import-list" });
    for (const note of strings.about.notes) {
      notesEl.createEl("li", { text: note });
    }
    notesEl.createEl("li", {
      text: `${strings.about.bundledPetPrefix}${PET_CATALOG[0]?.displayName ?? "Nia"}${strings.about.bundledPetSuffix}`
    });

    const projectLinksEl = containerEl.createDiv({ cls: "petsidian-about-links" });
    projectLinksEl.createEl("p", {
      cls: "petsidian-import-subtitle",
      text: strings.about.linksTitle
    });
    this.createExternalShortcut(projectLinksEl, strings.about.githubLabel, strings.about.githubUrl);
    this.createExternalShortcut(projectLinksEl, strings.about.supportLabel, strings.about.supportUrl);

    const friendLinksEl = containerEl.createDiv({ cls: "petsidian-about-links" });
    friendLinksEl.createEl("p", {
      cls: "petsidian-import-subtitle",
      text: strings.about.friendLinksTitle
    });
    for (const friendLink of strings.about.friendLinks) {
      this.createExternalShortcut(friendLinksEl, friendLink.label, friendLink.href);
    }
  }

  private createImportCard(
    containerEl: HTMLElement,
    title: string,
    copy: string,
    wide = false
  ): HTMLDivElement {
    const cardEl = containerEl.createDiv({
      cls: wide ? "petsidian-import-card is-wide" : "petsidian-import-card"
    });
    const headerEl = cardEl.createDiv({ cls: "petsidian-import-card-header" });
    headerEl.createEl("h4", { cls: "petsidian-import-card-title", text: title });
    headerEl.createEl("p", { cls: "petsidian-import-card-copy", text: copy });
    return cardEl;
  }

  private createExternalShortcut(
    containerEl: HTMLElement,
    label: string,
    href: string
  ): void {
    const linkEl = containerEl.createEl("a", {
      cls: "petsidian-link-pill",
      href,
      text: label
    });
    linkEl.setAttribute("target", "_blank");
    linkEl.setAttribute("rel", "noopener noreferrer");
  }
}
