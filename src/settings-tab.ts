import { App, PluginSettingTab, Setting } from "obsidian";
import type PetsidianPlugin from "./main";
import { isPetActionAnimationId, PET_ACTION_LABELS } from "./pet/animation";
import { COMPANION_EVENTS, COMPANION_EVENT_TYPES } from "./pet/events";
import { getAvailableActions } from "./pet/settings";

export class PetsidianSettingTab extends PluginSettingTab {
  private readonly plugin: PetsidianPlugin;

  constructor(app: App, plugin: PetsidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("petsidian-settings");
    new Setting(containerEl).setName("Petsidian").setHeading();
    containerEl.createEl("p", {
      text: "Configure the detached desktop pet window. Petsidian is desktop-only and uses Obsidian's Electron runtime to create a transparent pet outside the main Obsidian window."
    });

    new Setting(containerEl)
      .setName("Show pet")
      .setDesc("Create or show the detached transparent desktop pet window.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.visible).onChange(async (visible) => {
          await this.plugin.updateSettings({ visible });
        })
      );

    new Setting(containerEl)
      .setName("Always on top")
      .setDesc("Keep the pet window above normal desktop windows.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.alwaysOnTop).onChange(async (alwaysOnTop) => {
          await this.plugin.updateSettings({ alwaysOnTop });
        })
      );

    new Setting(containerEl)
      .setName("Skip taskbar")
      .setDesc("Hide the pet window from the operating-system taskbar or dock when Electron supports it.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.skipTaskbar).onChange(async (skipTaskbar) => {
          await this.plugin.updateSettings({ skipTaskbar });
        })
      );

    new Setting(containerEl)
      .setName("Scale")
      .setDesc("Adjust the rendered pet size.")
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 2, 0.05)
          .setValue(this.plugin.settings.scale)
          .setDynamicTooltip()
          .onChange(async (scale) => {
            await this.plugin.updateSettings({ scale });
          })
      );

    new Setting(containerEl)
      .setName("Reduced motion")
      .setDesc("Show a still frame and disable autonomous walking.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.reducedMotion).onChange(async (reducedMotion) => {
          await this.plugin.updateSettings({ reducedMotion });
        })
      );

    new Setting(containerEl)
      .setName("Click action mode")
      .setDesc("Use a fixed action or randomly pick from the action pool.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("fixed", "Fixed")
          .addOption("random", "Random")
          .setValue(this.plugin.settings.clickActionMode)
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
        return dropdown.setValue(this.plugin.settings.clickAction).onChange(async (value) => {
          if (isPetActionAnimationId(value)) {
            await this.plugin.updateSettings({ clickAction: value });
          }
        });
      });

    new Setting(containerEl)
      .setName("Bubbles")
      .setDesc("Show speech bubbles for clicks, commands, and companion events.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.bubblesEnabled).onChange(async (bubblesEnabled) => {
          await this.plugin.updateSettings({ bubblesEnabled });
        })
      );

    new Setting(containerEl)
      .setName("Bubble duration")
      .setDesc("How long bubbles remain visible.")
      .addSlider((slider) =>
        slider
          .setLimits(1000, 15000, 500)
          .setValue(this.plugin.settings.bubbleTtlMs)
          .setDynamicTooltip()
          .onChange(async (bubbleTtlMs) => {
            await this.plugin.updateSettings({ bubbleTtlMs });
          })
      );

    new Setting(containerEl)
      .setName("Autonomous walking")
      .setDesc("Move the detached pet window horizontally within the primary display work area.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autonomousWalking).onChange(async (autonomousWalking) => {
          await this.plugin.updateSettings({ autonomousWalking });
        })
      );

    new Setting(containerEl)
      .setName("Walking speed")
      .setDesc("Horizontal movement speed in pixels per second.")
      .addSlider((slider) =>
        slider
          .setLimits(10, 160, 5)
          .setValue(this.plugin.settings.walkingSpeedPx)
          .setDynamicTooltip()
          .onChange(async (walkingSpeedPx) => {
            await this.plugin.updateSettings({ walkingSpeedPx });
          })
      );

    let previewEventType = "thinking";
    new Setting(containerEl)
      .setName("Preview companion events")
      .setDesc("Trigger the OpenPet-compatible event-to-animation mapping.")
      .addDropdown((dropdown) => {
        for (const eventType of COMPANION_EVENT_TYPES) {
          dropdown.addOption(eventType, COMPANION_EVENTS[eventType].label);
        }
        return dropdown.setValue(previewEventType).onChange((eventType) => {
          previewEventType = eventType;
        });
      })
      .addButton((button) =>
        button.setButtonText("Trigger").onClick(() => {
          void this.plugin.triggerCompanionEvent(previewEventType);
        })
      );
  }
}
