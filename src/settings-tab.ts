import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type PetsidianPlugin from "./main";
import { isPetActionAnimationId, PET_ACTION_LABELS } from "./pet/animation";
import { PET_CATALOG } from "./pet/catalog";
import { COMPANION_EVENTS, COMPANION_EVENT_TYPES } from "./pet/events";
import { getAvailableActions, getAvailableIdleActions, getBubbleStyles } from "./pet/settings";

export class PetsidianSettingTab extends PluginSettingTab {
  private readonly plugin: PetsidianPlugin;
  private localImportSource = "";
  private websiteImportUrl = "";

  constructor(app: App, plugin: PetsidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    const catalog = this.plugin.getPetCatalog();
    containerEl.empty();
    containerEl.addClass("petsidian-settings");

    new Setting(containerEl).setName("Petsidian").setHeading();
    containerEl.createEl("p", {
      text:
        "Configure the detached desktop pet window. Petsidian is desktop-only and uses Obsidian's Electron runtime to create a transparent pet outside the main Obsidian window."
    });

    containerEl.createEl("h3", { text: "Window & visibility" });

    new Setting(containerEl)
      .setName("Show pet")
      .setDesc("Create or show the detached transparent desktop pet window.")
      .addToggle((toggle) =>
        toggle.setValue(settings.visible).onChange(async (visible) => {
          await this.plugin.updateSettings({ visible });
        })
      );

    new Setting(containerEl)
      .setName("Always on top")
      .setDesc("Keep the pet window above normal desktop windows.")
      .addToggle((toggle) =>
        toggle.setValue(settings.alwaysOnTop).onChange(async (alwaysOnTop) => {
          await this.plugin.updateSettings({ alwaysOnTop });
        })
      );

    new Setting(containerEl)
      .setName("Skip taskbar")
      .setDesc("Hide the pet window from the operating-system taskbar or dock when Electron supports it.")
      .addToggle((toggle) =>
        toggle.setValue(settings.skipTaskbar).onChange(async (skipTaskbar) => {
          await this.plugin.updateSettings({ skipTaskbar });
        })
      );

    new Setting(containerEl)
      .setName("Language")
      .setDesc("Use English or Simplified Chinese for the detached pet UI labels.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("en", "English")
          .addOption("zh-CN", "简体中文")
          .setValue(settings.language)
          .onChange(async (language) => {
            await this.plugin.updateSettings({ language: language === "zh-CN" ? "zh-CN" : "en" });
          })
      );

    containerEl.createEl("h3", { text: "Pet catalog" });

    new Setting(containerEl)
      .setName("Active pet")
      .setDesc("Choose a bundled or imported pet.")
      .addDropdown((dropdown) => {
        for (const pet of catalog) {
          dropdown.addOption(
            pet.id,
            pet.imported ? `${pet.displayName} (imported)` : pet.displayName
          );
        }
        return dropdown.setValue(settings.activePetId).onChange(async (value) => {
          await this.plugin.updateSettings({ activePetId: value });
        });
      });

    if (settings.importedPets.length > 0) {
      containerEl.createEl("p", {
        text: "Imported pets are stored in plugin settings as WebP data URLs for this parity pass."
      });
      for (const importedPet of settings.importedPets) {
        new Setting(containerEl)
          .setName(importedPet.displayName)
          .setDesc(importedPet.sourceUrl ?? importedPet.description)
          .addButton((button) =>
            button.setButtonText("Use").onClick(async () => {
              await this.plugin.updateSettings({ activePetId: importedPet.id });
              new Notice(`Active pet set to ${importedPet.displayName}.`);
            })
          )
          .addButton((button) =>
            button
              .setButtonText("Remove")
              .setWarning()
              .onClick(async () => {
                await this.plugin.removeImportedPet(importedPet.id);
              })
          );
      }
    }

    containerEl.createEl("h3", { text: "Import pets" });

    new Setting(containerEl)
      .setName("Local import path")
      .setDesc("Import from a package directory, pet.json, or spritesheet.webp file.")
      .addText((text) => {
        text
          .setPlaceholder("C:\\Users\\you\\Pets\\sample\\pet.json")
          .setValue(this.localImportSource)
          .onChange((value) => {
            this.localImportSource = value;
          });
        text.inputEl.style.width = "24rem";
      })
      .addButton((button) =>
        button.setButtonText("Browse").onClick(async () => {
          const selectedPath = await this.plugin.chooseLocalImportSource();
          if (selectedPath !== null) {
            this.localImportSource = selectedPath;
            this.display();
          }
        })
      )
      .addButton((button) =>
        button.setCta().setButtonText("Import").onClick(async () => {
          if (this.localImportSource.trim().length === 0) {
            new Notice("Enter or choose a local pet path first.");
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

    new Setting(containerEl)
      .setName("Website import URL")
      .setDesc(
        "Supports Petdex, Codex Pets, and compatible HTTPS pages that expose a Codex-style spritesheet.webp."
      )
      .addText((text) => {
        text
          .setPlaceholder("https://petdex.crafter.run/pets/boba")
          .setValue(this.websiteImportUrl)
          .onChange((value) => {
            this.websiteImportUrl = value;
          });
        text.inputEl.style.width = "24rem";
      })
      .addButton((button) =>
        button.setCta().setButtonText("Import").onClick(async () => {
          if (this.websiteImportUrl.trim().length === 0) {
            new Notice("Paste a supported pet page URL first.");
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

    containerEl.createEl("p", {
      text: "Supported sources: Petdex, Codex Pets, and generic HTTPS pages exposing a public spritesheet.webp."
    });

    containerEl.createEl("h3", { text: "Motion & idle behavior" });

    new Setting(containerEl)
      .setName("Scale")
      .setDesc("Adjust the rendered pet size.")
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
      .setName("Reduced motion")
      .setDesc("Show stiller animation and disable autonomous walking.")
      .addToggle((toggle) =>
        toggle.setValue(settings.reducedMotion).onChange(async (reducedMotion) => {
          await this.plugin.updateSettings({ reducedMotion });
        })
      );

    new Setting(containerEl)
      .setName("Autonomous walking")
      .setDesc("Move the detached pet window horizontally within the primary display work area.")
      .addToggle((toggle) =>
        toggle.setValue(settings.autonomousWalking).onChange(async (autonomousWalking) => {
          await this.plugin.updateSettings({ autonomousWalking });
        })
      );

    new Setting(containerEl)
      .setName("Walking speed")
      .setDesc("Horizontal movement speed in pixels per second.")
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
      .setName("Pause on hover")
      .setDesc("Pause autonomous walking while the cursor is over the pet.")
      .addToggle((toggle) =>
        toggle.setValue(settings.hoverPause).onChange(async (hoverPause) => {
          await this.plugin.updateSettings({ hoverPause });
        })
      );

    new Setting(containerEl)
      .setName("Idle self-play")
      .setDesc("After a quiet period, reuse action animations for small autonomous moments.")
      .addToggle((toggle) =>
        toggle.setValue(settings.idleSelfPlay).onChange(async (idleSelfPlay) => {
          await this.plugin.updateSettings({ idleSelfPlay });
        })
      );

    new Setting(containerEl)
      .setName("Idle threshold")
      .setDesc("How long the pet waits before self-play can start.")
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
      .setName("Idle action frequency")
      .setDesc("Minimum spacing between idle self-play actions.")
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
      .setName("Idle action")
      .setDesc("Choose a specific idle action or reuse the click/random action pool.")
      .addDropdown((dropdown) => {
        for (const action of getAvailableIdleActions()) {
          const label =
            action === "random"
              ? "Surprise me"
              : action === "active-action"
                ? "Use click action"
                : isPetActionAnimationId(action)
                  ? PET_ACTION_LABELS[action]
                  : action;
          dropdown.addOption(
            action,
            label
          );
        }
        return dropdown.setValue(settings.idleAction).onChange(async (idleAction) => {
          await this.plugin.updateSettings({ idleAction: idleAction as typeof settings.idleAction });
        });
      });

    containerEl.createEl("h3", { text: "Click & companion reactions" });

    new Setting(containerEl)
      .setName("Click action mode")
      .setDesc("Use a fixed action or randomly pick from the action pool.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("fixed", "Fixed")
          .addOption("random", "Random")
          .setValue(settings.clickActionMode)
          .onChange(async (clickActionMode) => {
            await this.plugin.updateSettings({
              clickActionMode: clickActionMode === "fixed" ? "fixed" : "random"
            });
          })
      );

    new Setting(containerEl)
      .setName("Fixed click action")
      .setDesc("The action used when click action mode is fixed, and as the random fallback.")
      .addDropdown((dropdown) => {
        for (const action of getAvailableActions()) {
          dropdown.addOption(action, PET_ACTION_LABELS[action]);
        }
        return dropdown.setValue(settings.clickAction).onChange(async (value) => {
          if (isPetActionAnimationId(value)) {
            await this.plugin.updateSettings({ clickAction: value });
          }
        });
      })
      .addButton((button) =>
        button.setButtonText("Preview").onClick(async () => {
          await this.plugin.triggerAction(settings.clickAction);
        })
      );

    containerEl.createEl("p", {
      text: "Random action pool:"
    });
    for (const action of getAvailableActions()) {
      new Setting(containerEl)
        .setName(PET_ACTION_LABELS[action])
        .setDesc("Allow this action when click mode is random or idle action is set to random.")
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
      .setName("Event reactions")
      .setDesc("Trigger animation reactions for companion events.")
      .addToggle((toggle) =>
        toggle.setValue(settings.eventReactions).onChange(async (eventReactions) => {
          await this.plugin.updateSettings({ eventReactions });
        })
      );

    new Setting(containerEl)
      .setName("Event bubbles")
      .setDesc("Show speech bubbles for companion events, click reactions, and quick previews.")
      .addToggle((toggle) =>
        toggle.setValue(settings.eventBubbles).onChange(async (eventBubbles) => {
          await this.plugin.updateSettings({ eventBubbles });
        })
      );

    let previewEventType = COMPANION_EVENT_TYPES[0];
    new Setting(containerEl)
      .setName("Preview companion events")
      .setDesc("Trigger the OpenPet-compatible event-to-animation mapping.")
      .addDropdown((dropdown) => {
        for (const eventType of COMPANION_EVENT_TYPES) {
          dropdown.addOption(eventType, COMPANION_EVENTS[eventType].label);
        }
        return dropdown.setValue(previewEventType).onChange((eventType) => {
          previewEventType = eventType as typeof previewEventType;
        });
      })
      .addButton((button) =>
        button.setButtonText("Trigger").onClick(() => {
          void this.plugin.triggerCompanionEvent(previewEventType);
        })
      );

    containerEl.createEl("h3", { text: "Bubble appearance" });

    new Setting(containerEl)
      .setName("Bubble style")
      .setDesc("Choose the detached pet bubble skin.")
      .addDropdown((dropdown) => {
        const labels: Record<string, string> = {
          soft: "Soft",
          comic: "Comic",
          glass: "Glass",
          terminal: "Terminal"
        };
        for (const style of getBubbleStyles()) {
          dropdown.addOption(style, labels[style] ?? style);
        }
        return dropdown.setValue(settings.bubbleStyle).onChange(async (bubbleStyle) => {
          await this.plugin.updateSettings({ bubbleStyle: bubbleStyle as typeof settings.bubbleStyle });
        });
      });

    new Setting(containerEl)
      .setName("Bubble duration")
      .setDesc("How long bubbles remain visible.")
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
      .setName("Bubble font family")
      .setDesc("CSS font-family applied to the detached pet bubble.")
      .addText((text) =>
        text
          .setPlaceholder("Aptos Display")
          .setValue(settings.bubbleFontFamily)
          .onChange(async (bubbleFontFamily) => {
            await this.plugin.updateSettings({ bubbleFontFamily });
          })
      );

    new Setting(containerEl)
      .setName("Bubble font size")
      .setDesc("Font size in pixels.")
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
      .setName("Bubble max width")
      .setDesc("Maximum bubble width in pixels.")
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
        button.setButtonText("Preview").onClick(() => {
          void this.plugin.say("Petsidian can preview your bubble style here.");
        })
      );

    containerEl.createEl("h3", { text: "Notes" });
    containerEl.createEl("ul", {
      cls: "petsidian-notes"
    });
    const notes = containerEl.querySelector(".petsidian-notes");
    notes?.createEl("li", {
      text:
        "Imported pets live in plugin settings as WebP data URLs in this pass, so extremely large sprite sheets are not ideal."
    });
    notes?.createEl("li", {
      text:
        "Petsidian ports OpenPet import, right-click menu, drag-to-position, and core pet behavior, but it still does not include the Tauri HTTP API, tray menu, or desktop click-through parity."
    });
    notes?.createEl("li", {
      text: `Bundled pet: ${PET_CATALOG[0]?.displayName ?? "Nia"}.`
    });
  }
}
