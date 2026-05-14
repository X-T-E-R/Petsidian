import {
  getPetRenderScale,
  getPetSpriteSize,
  PET_ANIMATIONS,
  PET_ATLAS,
  type PetActionAnimationId
} from "./pet/animation";
import { getCatalogPet, type PetCatalogItem } from "./pet/catalog";
import type { PetsidianSettings } from "./pet/settings";
import {
  resolveElectronRuntime,
  type BrowserWindowLike,
  type DesktopRuntime,
  type ScreenLike,
  type WorkArea
} from "./electron-runtime";

type DesktopPetWindowOptions = {
  getSettings: () => PetsidianSettings;
  getCatalog: () => readonly PetCatalogItem[];
  onOpenSettings: () => void;
  onUpdateSettings: (partial: Partial<PetsidianSettings>) => Promise<void>;
};

type RendererSnapshot = {
  settings: PetsidianSettings;
  pet: {
    displayName: string;
    spritesheetUrl: string;
  };
};

type RendererCommand =
  | { type: "open-settings" }
  | { type: "wave" }
  | { type: "toggle-walking" }
  | { type: "hide-pet" };

type RendererDragState = {
  active: boolean;
  startScreenX: number;
  startScreenY: number;
  latestScreenX: number;
  latestScreenY: number;
  started: boolean;
  ended: boolean;
};

type RendererHostState = {
  commands: RendererCommand[];
  drag: RendererDragState | null;
  hovered: boolean;
  contextMenuOpen: boolean;
};

type DragSession = {
  startScreenX: number;
  startScreenY: number;
  startWindowX: number;
  startWindowY: number;
};

const PET_WINDOW_MARGIN_PX = 24;
const PET_WINDOW_BUBBLE_SPACE_PX = 96;
const WALK_INTERVAL_MS = 50;
const BRIDGE_POLL_MS = 33;

function getPrimaryWorkArea(screen: ScreenLike | undefined): WorkArea {
  if (screen === undefined) {
    return {
      x: 0,
      y: 0,
      width: window.screen.availWidth || 1280,
      height: window.screen.availHeight || 720
    };
  }
  return screen.getPrimaryDisplay().workArea;
}

function getWindowSize(settings: PetsidianSettings): { width: number; height: number } {
  const spriteSize = getPetSpriteSize(settings.scale);
  return {
    width: Math.max(spriteSize.width + 32, 280),
    height: spriteSize.height + PET_WINDOW_BUBBLE_SPACE_PX
  };
}

function buildInitialPosition(
  settings: PetsidianSettings,
  workArea: WorkArea
): { x: number; y: number } {
  const size = getWindowSize(settings);
  if (settings.windowPosition !== null) {
    return {
      x: settings.windowPosition.x,
      y: settings.windowPosition.y
    };
  }
  return {
    x: Math.round(workArea.x + workArea.width - size.width - PET_WINDOW_MARGIN_PX),
    y: Math.round(workArea.y + workArea.height - size.height - PET_WINDOW_MARGIN_PX)
  };
}

function toExecutableLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildRendererSnapshot(
  settings: PetsidianSettings,
  catalog: readonly PetCatalogItem[]
): RendererSnapshot {
  const pet = getCatalogPet(settings.activePetId, catalog);
  return {
    settings,
    pet: {
      displayName: pet.displayName,
      spritesheetUrl: pet.spritesheetUrl
    }
  };
}

function buildRendererHtml(): string {
  const placeholderSettings = {
    scale: 1,
    reducedMotion: false,
    clickActionMode: "fixed",
    clickAction: "waving",
    clickActionPool: ["waving"],
    bubbleStyle: "soft",
    bubbleFontFamily: "Aptos Display",
    bubbleFontSizePx: 14,
    bubbleMaxWidthPx: 292,
    eventBubbleTtlMs: 4000,
    autonomousWalking: false,
    hoverPause: true,
    idleSelfPlay: true,
    idleThresholdMs: 45000,
    idleActionFrequencyMs: 30000,
    idleAction: "random",
    language: "en"
  };
  const spriteSize = getPetSpriteSize(placeholderSettings.scale);
  const renderScale = getPetRenderScale(placeholderSettings.scale);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Petsidian Desktop Pet</title>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"
    >
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        user-select: none;
      }

      #root {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 8px;
        box-sizing: border-box;
        background: transparent;
      }

      #bubble {
        max-width: 260px;
        min-height: 0;
        padding: 8px 10px;
        border: 1px solid rgba(88, 95, 112, 0.24);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.92);
        color: #242936;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        font-size: 13px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 160ms ease, transform 160ms ease;
        pointer-events: none;
      }

      #bubble.visible {
        opacity: 1;
        transform: translateY(0);
      }

      body[data-bubble-style="comic"] #bubble {
        border-width: 2px;
        border-color: #1f1f1f;
        background: #fff9d9;
        box-shadow: 0 8px 0 rgba(31, 31, 31, 0.12);
      }

      body[data-bubble-style="glass"] #bubble {
        border-color: rgba(255, 255, 255, 0.26);
        background: rgba(241, 248, 255, 0.72);
        backdrop-filter: blur(10px);
      }

      body[data-bubble-style="terminal"] #bubble {
        border-color: rgba(38, 255, 120, 0.34);
        background: rgba(3, 14, 8, 0.92);
        color: #9dffbc;
        box-shadow: 0 10px 28px rgba(3, 14, 8, 0.4);
      }

      #pet {
        width: ${spriteSize.width}px;
        height: ${spriteSize.height}px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background-color: transparent;
        background-repeat: no-repeat;
        background-size: ${PET_ATLAS.width * renderScale}px ${PET_ATLAS.height * renderScale}px;
        cursor: grab;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
        transition: transform 160ms ease;
      }

      #pet:hover, #pet:focus-visible {
        outline: none;
        transform: translateY(-2px);
      }

      #pet.dragging {
        cursor: grabbing;
        transform: translateY(0);
      }

      #context-menu {
        position: fixed;
        min-width: 176px;
        display: none;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        border: 1px solid rgba(88, 95, 112, 0.18);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.97);
        box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
        pointer-events: auto;
      }

      #context-menu.visible {
        display: flex;
      }

      .context-item {
        width: 100%;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: #242936;
        padding: 9px 10px;
        text-align: left;
        font-size: 13px;
        cursor: pointer;
      }

      .context-item:hover,
      .context-item:focus-visible {
        outline: none;
        background: rgba(101, 131, 231, 0.12);
      }

      body.reduced-motion #bubble,
      body.reduced-motion #pet {
        transition: none;
      }
    </style>
  </head>
  <body data-bubble-style="soft">
    <main id="root" aria-live="polite">
      <div id="bubble"></div>
      <button id="pet" type="button" aria-label="Petsidian desktop pet"></button>
    </main>
    <div id="context-menu" role="menu" aria-label="Petsidian pet actions">
      <button class="context-item" data-command="open-settings" type="button"></button>
      <button class="context-item" data-command="wave" type="button"></button>
      <button class="context-item" data-command="toggle-walking" type="button"></button>
      <button class="context-item" data-command="hide-pet" type="button"></button>
    </div>
    <script>
      (() => {
        "use strict";

        const TRANSLATIONS = {
          en: {
            openSettings: "Open settings",
            wave: "Wave",
            pauseWalking: "Pause walking",
            roam: "Let me roam",
            hidePet: "Hide pet",
            clickBubble: "Hi from Petsidian!"
          },
          "zh-CN": {
            openSettings: "打开设置",
            wave: "挥手",
            pauseWalking: "暂停移动",
            roam: "自由移动",
            hidePet: "隐藏宠物",
            clickBubble: "Petsidian 来啦！"
          }
        };

        const state = {
          atlas: ${toExecutableLiteral(PET_ATLAS)},
          animations: ${toExecutableLiteral(PET_ANIMATIONS)},
          settings: ${toExecutableLiteral(placeholderSettings)},
          pet: {
            displayName: "Petsidian",
            spritesheetUrl: ""
          }
        };

        const petButton = document.getElementById("pet");
        const bubble = document.getElementById("bubble");
        const contextMenu = document.getElementById("context-menu");
        const contextItems = Array.from(contextMenu.querySelectorAll("[data-command]"));

        const hostState = {
          commands: [],
          drag: null,
          hovered: false,
          contextMenuOpen: false
        };

        let activeAnimationId = "idle";
        let animationStartedAtMs = performance.now();
        let actionEndsAtMs = 0;
        let bubbleTimerId = null;
        let walkingDirection = 1;
        let suppressClick = false;
        let lastActivityAtMs = performance.now();
        let lastIdleActionAtMs = 0;

        function getAnimation(id) {
          return state.animations[id] || state.animations.idle;
        }

        function getAnimationDuration(animation) {
          return animation.frameDurationsMs.reduce((sum, value) => sum + value, 0);
        }

        function getFrameAtTime(animation, elapsedMs) {
          const totalDuration = getAnimationDuration(animation);
          if (totalDuration <= 0) return 0;
          const cursor = ((elapsedMs % totalDuration) + totalDuration) % totalDuration;
          let consumed = 0;
          for (let index = 0; index < animation.frameDurationsMs.length; index += 1) {
            consumed += animation.frameDurationsMs[index] || 0;
            if (cursor < consumed) return index;
          }
          return Math.max(0, animation.frameCount - 1);
        }

        function queueCommand(command) {
          hostState.commands.push(command);
        }

        function markActivity() {
          lastActivityAtMs = performance.now();
        }

        function getLanguageStrings() {
          return TRANSLATIONS[state.settings.language] || TRANSLATIONS.en;
        }

        function getFrameOffset(animation, frame) {
          const safeFrame = Math.min(Math.max(0, frame), animation.frameCount - 1);
          const renderScale = Math.max(0.25, state.settings.scale * 0.75);
          return {
            x: -safeFrame * state.atlas.cellWidth * renderScale,
            y: -animation.row * state.atlas.cellHeight * renderScale
          };
        }

        function pickActionFromPool() {
          const pool = Array.isArray(state.settings.clickActionPool) && state.settings.clickActionPool.length > 0
            ? state.settings.clickActionPool
            : [state.settings.clickAction || "waving"];
          return pool[Math.floor(Math.random() * pool.length)] || state.settings.clickAction || "waving";
        }

        function pickIdleAction() {
          if (state.settings.idleAction === "active-action") {
            return state.settings.clickAction || "waving";
          }
          if (state.settings.idleAction === "random") {
            return pickActionFromPool();
          }
          return state.settings.idleAction || "waving";
        }

        function applyBubbleAppearance() {
          document.body.dataset.bubbleStyle = state.settings.bubbleStyle || "soft";
          bubble.style.fontFamily = state.settings.bubbleFontFamily || "Aptos Display";
          bubble.style.fontSize = (state.settings.bubbleFontSizePx || 14) + "px";
          bubble.style.maxWidth =
            "min(" + (state.settings.bubbleMaxWidthPx || 292) + "px, calc(100vw - 24px))";
        }

        function applyContextMenuLabels() {
          const strings = getLanguageStrings();
          const menuLabels = {
            "open-settings": strings.openSettings,
            wave: strings.wave,
            "toggle-walking": state.settings.autonomousWalking ? strings.pauseWalking : strings.roam,
            "hide-pet": strings.hidePet
          };
          for (const item of contextItems) {
            const command = item.getAttribute("data-command");
            item.textContent = command && menuLabels[command] ? menuLabels[command] : command;
          }
        }

        function applySnapshot(snapshot) {
          state.settings = { ...state.settings, ...snapshot.settings };
          state.pet = { ...snapshot.pet };

          const renderScale = Math.max(0.25, state.settings.scale * 0.75);
          const spriteWidth = Math.ceil(state.atlas.cellWidth * renderScale);
          const spriteHeight = Math.ceil(state.atlas.cellHeight * renderScale);
          petButton.style.width = spriteWidth + "px";
          petButton.style.height = spriteHeight + "px";
          petButton.style.backgroundImage = snapshot.pet.spritesheetUrl
            ? "url(" + JSON.stringify(snapshot.pet.spritesheetUrl) + ")"
            : "none";
          petButton.style.backgroundSize =
            (state.atlas.width * renderScale) + "px " + (state.atlas.height * renderScale) + "px";
          petButton.setAttribute("aria-label", snapshot.pet.displayName || "Petsidian desktop pet");
          document.body.classList.toggle("reduced-motion", Boolean(state.settings.reducedMotion));
          applyBubbleAppearance();
          applyContextMenuLabels();
        }

        function hideBubble() {
          bubble.classList.remove("visible");
        }

        function showBubble(text, ttlMs) {
          const normalized = String(text || "").trim();
          if (!normalized || !state.settings.eventBubbles) return;
          bubble.textContent = normalized.slice(0, 512);
          bubble.classList.add("visible");
          if (bubbleTimerId !== null) window.clearTimeout(bubbleTimerId);
          bubbleTimerId = window.setTimeout(hideBubble, ttlMs || state.settings.eventBubbleTtlMs || 4000);
        }

        function playAction(animationId, bubbleText, ttlMs) {
          markActivity();
          activeAnimationId =
            typeof animationId === "string" && state.animations[animationId] ? animationId : "waving";
          const now = performance.now();
          animationStartedAtMs = now;
          actionEndsAtMs = now + getAnimationDuration(getAnimation(activeAnimationId));
          if (bubbleText !== undefined && bubbleText !== null) showBubble(bubbleText, ttlMs);
        }

        function maybeTriggerIdleAction(now) {
          const dragActive = Boolean(hostState.drag && !hostState.drag.ended);
          if (!state.settings.idleSelfPlay || state.settings.reducedMotion || dragActive || hostState.contextMenuOpen || hostState.hovered) {
            return;
          }
          if (activeAnimationId !== "idle") return;
          if (now - lastActivityAtMs < state.settings.idleThresholdMs) return;
          if (now - lastIdleActionAtMs < state.settings.idleActionFrequencyMs) return;
          const idleAction = pickIdleAction();
          lastIdleActionAtMs = now;
          playAction(idleAction, null, null);
        }

        function renderFrame(now) {
          if (activeAnimationId !== "idle" && now >= actionEndsAtMs) {
            activeAnimationId = "idle";
            animationStartedAtMs = now;
            actionEndsAtMs = 0;
          }

          maybeTriggerIdleAction(now);
          const animationId =
            state.settings.autonomousWalking && !state.settings.reducedMotion && activeAnimationId === "idle"
              ? (walkingDirection > 0 ? "running-right" : "running-left")
              : activeAnimationId;
          const animation = getAnimation(animationId);
          const elapsedMs = state.settings.reducedMotion ? 0 : now - animationStartedAtMs;
          const frame = state.settings.reducedMotion ? 0 : getFrameAtTime(animation, elapsedMs);
          const offset = getFrameOffset(animation, frame);
          petButton.style.backgroundPosition = offset.x + "px " + offset.y + "px";
          window.requestAnimationFrame(renderFrame);
        }

        function closeContextMenu() {
          hostState.contextMenuOpen = false;
          contextMenu.classList.remove("visible");
          document.title = "Petsidian Desktop Pet";
        }

        function openContextMenu(screenX, screenY) {
          const menuWidth = 196;
          const menuHeight = 176;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const left = Math.min(Math.max(8, screenX - window.screenX), Math.max(8, viewportWidth - menuWidth - 8));
          const top = Math.min(Math.max(8, screenY - window.screenY), Math.max(8, viewportHeight - menuHeight - 8));
          contextMenu.style.left = left + "px";
          contextMenu.style.top = top + "px";
          hostState.contextMenuOpen = true;
          contextMenu.classList.add("visible");
          document.title = "Petsidian Desktop Pet - Menu";
        }

        petButton.addEventListener("pointerenter", () => {
          hostState.hovered = true;
        });

        petButton.addEventListener("pointerleave", () => {
          hostState.hovered = false;
        });

        petButton.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          markActivity();
          closeContextMenu();
          hostState.drag = {
            active: true,
            startScreenX: event.screenX,
            startScreenY: event.screenY,
            latestScreenX: event.screenX,
            latestScreenY: event.screenY,
            started: false,
            ended: false
          };
          suppressClick = false;
          petButton.classList.add("dragging");
          petButton.setPointerCapture?.(event.pointerId);
        });

        petButton.addEventListener("pointermove", (event) => {
          const drag = hostState.drag;
          if (!drag || drag.ended) return;
          drag.latestScreenX = event.screenX;
          drag.latestScreenY = event.screenY;
          if (!drag.started) {
            const distance = Math.hypot(drag.latestScreenX - drag.startScreenX, drag.latestScreenY - drag.startScreenY);
            if (distance >= 4) {
              drag.started = true;
              suppressClick = true;
            }
          }
        });

        function endDrag() {
          if (hostState.drag) {
            hostState.drag.ended = true;
          }
          petButton.classList.remove("dragging");
        }

        petButton.addEventListener("pointerup", () => {
          endDrag();
        });

        petButton.addEventListener("pointercancel", () => {
          endDrag();
        });

        petButton.addEventListener("click", () => {
          if (suppressClick) {
            suppressClick = false;
            return;
          }
          const animationId = state.settings.clickActionMode === "random"
            ? pickActionFromPool()
            : state.settings.clickAction;
          playAction(animationId, getLanguageStrings().clickBubble, state.settings.eventBubbleTtlMs);
        });

        petButton.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          markActivity();
          openContextMenu(event.screenX, event.screenY);
        });

        contextItems.forEach((item) => {
          item.addEventListener("click", () => {
            const command = item.getAttribute("data-command");
            if (command === "open-settings" || command === "wave" || command === "toggle-walking" || command === "hide-pet") {
              queueCommand({ type: command });
              closeContextMenu();
            }
          });
        });

        document.addEventListener("mousedown", (event) => {
          if (!contextMenu.contains(event.target) && event.target !== petButton) {
            closeContextMenu();
          }
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeContextMenu();
          }
        });

        window.PetsidianRenderer = {
          applySnapshot,
          playAction,
          say: showBubble,
          setWalkingDirection: (direction) => {
            walkingDirection = direction >= 0 ? 1 : -1;
          },
          flushHostState: () => {
            const payload = {
              commands: hostState.commands.splice(0),
              drag: hostState.drag ? { ...hostState.drag } : null,
              hovered: hostState.hovered,
              contextMenuOpen: hostState.contextMenuOpen
            };
            if (hostState.drag && hostState.drag.ended) {
              hostState.drag = null;
            }
            return payload;
          }
        };

        applySnapshot({
          settings: state.settings,
          pet: state.pet
        });
        window.requestAnimationFrame(renderFrame);
      })();
    </script>
  </body>
</html>`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRendererCommand(value: unknown): value is RendererCommand {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    ["open-settings", "wave", "toggle-walking", "hide-pet"].includes(value.type)
  );
}

function readRendererDragState(value: unknown): RendererDragState | null {
  if (!isRecord(value)) return null;
  const startScreenX = value.startScreenX;
  const startScreenY = value.startScreenY;
  const latestScreenX = value.latestScreenX;
  const latestScreenY = value.latestScreenY;
  if (
    typeof startScreenX !== "number" ||
    !Number.isFinite(startScreenX) ||
    typeof startScreenY !== "number" ||
    !Number.isFinite(startScreenY) ||
    typeof latestScreenX !== "number" ||
    !Number.isFinite(latestScreenX) ||
    typeof latestScreenY !== "number" ||
    !Number.isFinite(latestScreenY)
  ) {
    return null;
  }
  if (typeof value.active !== "boolean" || typeof value.started !== "boolean" || typeof value.ended !== "boolean") {
    return null;
  }
  return {
    active: value.active,
    startScreenX,
    startScreenY,
    latestScreenX,
    latestScreenY,
    started: value.started,
    ended: value.ended
  };
}

function readRendererHostState(value: unknown): RendererHostState | null {
  if (!isRecord(value) || !Array.isArray(value.commands)) return null;
  const commands = value.commands.filter(isRendererCommand);
  if (typeof value.hovered !== "boolean" || typeof value.contextMenuOpen !== "boolean") {
    return null;
  }
  return {
    commands,
    drag: readRendererDragState(value.drag),
    hovered: value.hovered,
    contextMenuOpen: value.contextMenuOpen
  };
}

export class DesktopPetWindow {
  private readonly options: DesktopPetWindowOptions;
  private runtime: DesktopRuntime | null = null;
  private window: BrowserWindowLike | null = null;
  private walkingTimerId: number | null = null;
  private bridgeTimerId: number | null = null;
  private bridgePolling = false;
  private walkingDirection = 1;
  private lastWalkTickMs = 0;
  private dragSession: DragSession | null = null;
  private hovered = false;
  private contextMenuOpen = false;

  constructor(options: DesktopPetWindowOptions) {
    this.options = options;
  }

  async show(): Promise<void> {
    const petWindow = await this.ensureWindow();
    this.applyNativeSettings(petWindow);
    this.clampWindowToWorkArea(petWindow);
    petWindow.show();
    this.startBridgePolling();
    await this.refreshFromSettings();
  }

  hide(): void {
    this.stopWalking();
    this.stopBridgePolling();
    if (this.window !== null && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  destroy(): void {
    this.stopWalking();
    this.stopBridgePolling();
    const petWindow = this.window;
    this.window = null;
    if (petWindow !== null && !petWindow.isDestroyed()) {
      petWindow.close();
      if (!petWindow.isDestroyed()) {
        petWindow.destroy();
      }
    }
  }

  async refreshFromSettings(): Promise<void> {
    const petWindow = this.window;
    if (petWindow === null || petWindow.isDestroyed()) return;

    const settings = this.options.getSettings();
    const size = getWindowSize(settings);
    petWindow.setSize(size.width, size.height, false);
    this.applyNativeSettings(petWindow);
    this.clampWindowToWorkArea(petWindow);
    await this.executeRendererMethod(
      "applySnapshot",
      buildRendererSnapshot(settings, this.options.getCatalog())
    );
    this.updateWalkingState();
  }

  async playAction(
    animationId: PetActionAnimationId,
    bubbleText?: string | null,
    ttlMs?: number | null
  ): Promise<void> {
    await this.show();
    await this.executeRendererMethod("playAction", animationId, bubbleText ?? null, ttlMs ?? null);
  }

  async say(text: string, ttlMs?: number | null): Promise<void> {
    await this.show();
    await this.executeRendererMethod("say", text, ttlMs ?? null);
  }

  private async ensureWindow(): Promise<BrowserWindowLike> {
    if (this.window !== null && !this.window.isDestroyed()) return this.window;

    this.runtime = this.runtime ?? resolveElectronRuntime();
    const settings = this.options.getSettings();
    const workArea = getPrimaryWorkArea(this.runtime.screen);
    const size = getWindowSize(settings);
    const position = buildInitialPosition(settings, workArea);
    const petWindow = new this.runtime.BrowserWindow({
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      alwaysOnTop: settings.alwaysOnTop,
      skipTaskbar: settings.skipTaskbar,
      hasShadow: false,
      backgroundColor: "#00000000",
      title: "Petsidian Desktop Pet",
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: false,
        sandbox: false
      }
    });

    petWindow.once("closed", () => {
      if (this.window === petWindow) {
        this.window = null;
      }
      this.dragSession = null;
      this.stopWalking();
      this.stopBridgePolling();
    });

    this.window = petWindow;
    await petWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildRendererHtml())}`);
    return petWindow;
  }

  private applyNativeSettings(petWindow: BrowserWindowLike): void {
    const settings = this.options.getSettings();
    petWindow.setAlwaysOnTop(settings.alwaysOnTop, "floating");
    petWindow.setSkipTaskbar(settings.skipTaskbar);
  }

  private clampWindowToWorkArea(petWindow: BrowserWindowLike): void {
    const runtime = this.runtime;
    const [currentX, currentY] = petWindow.getPosition();
    const workArea = getPrimaryWorkArea(runtime?.screen);
    const [width, height] = petWindow.getSize();
    const minX = workArea.x;
    const minY = workArea.y;
    const maxX = Math.max(minX, workArea.x + workArea.width - width);
    const maxY = Math.max(minY, workArea.y + workArea.height - height);
    const fallback = buildInitialPosition(this.options.getSettings(), workArea);
    const nextX = Number.isFinite(currentX) ? Math.min(Math.max(currentX, minX), maxX) : fallback.x;
    const nextY = Number.isFinite(currentY) ? Math.min(Math.max(currentY, minY), maxY) : fallback.y;
    if (nextX !== currentX || nextY !== currentY) {
      petWindow.setPosition(Math.round(nextX), Math.round(nextY), false);
    }
  }

  private updateWalkingState(): void {
    const settings = this.options.getSettings();
    const pausedByInteraction =
      (settings.hoverPause && this.hovered) || this.contextMenuOpen || this.dragSession !== null;
    if (!settings.autonomousWalking || settings.reducedMotion || this.window === null || pausedByInteraction) {
      this.stopWalking();
      return;
    }
    this.startWalking();
  }

  private startWalking(): void {
    if (this.walkingTimerId !== null) return;
    this.lastWalkTickMs = performance.now();
    this.walkingTimerId = window.setInterval(() => {
      void this.walkDesktopWindow();
    }, WALK_INTERVAL_MS);
  }

  private stopWalking(): void {
    if (this.walkingTimerId !== null) {
      window.clearInterval(this.walkingTimerId);
      this.walkingTimerId = null;
    }
  }

  private startBridgePolling(): void {
    if (this.bridgeTimerId !== null) return;
    this.bridgeTimerId = window.setInterval(() => {
      void this.pollRendererBridge();
    }, BRIDGE_POLL_MS);
  }

  private stopBridgePolling(): void {
    if (this.bridgeTimerId !== null) {
      window.clearInterval(this.bridgeTimerId);
      this.bridgeTimerId = null;
    }
  }

  private async pollRendererBridge(): Promise<void> {
    if (this.bridgePolling) return;
    const petWindow = this.window;
    if (petWindow === null || petWindow.isDestroyed()) return;
    this.bridgePolling = true;

    try {
      const result = await petWindow.webContents.executeJavaScript(
        "window.PetsidianRenderer && window.PetsidianRenderer.flushHostState ? window.PetsidianRenderer.flushHostState() : null;",
        true
      );
      const hostState = readRendererHostState(result);
      if (hostState === null) return;
      this.hovered = hostState.hovered;
      this.contextMenuOpen = hostState.contextMenuOpen;
      await this.handleRendererCommands(hostState.commands);
      await this.handleRendererDrag(hostState.drag);
      this.updateWalkingState();
    } finally {
      this.bridgePolling = false;
    }
  }

  private async handleRendererCommands(commands: readonly RendererCommand[]): Promise<void> {
    for (const command of commands) {
      switch (command.type) {
        case "open-settings":
          this.options.onOpenSettings();
          break;
        case "wave":
          await this.playAction("waving");
          break;
        case "toggle-walking":
          await this.options.onUpdateSettings({
            autonomousWalking: !this.options.getSettings().autonomousWalking
          });
          break;
        case "hide-pet":
          await this.options.onUpdateSettings({ visible: false });
          break;
      }
    }
  }

  private async handleRendererDrag(drag: RendererDragState | null): Promise<void> {
    const petWindow = this.window;
    if (petWindow === null || petWindow.isDestroyed()) return;

    if (drag === null) {
      if (this.dragSession !== null) {
        await this.persistWindowPosition();
      }
      this.dragSession = null;
      return;
    }

    if (!drag.active) {
      return;
    }

    if (this.dragSession === null) {
      const [startWindowX, startWindowY] = petWindow.getPosition();
      this.dragSession = {
        startScreenX: drag.startScreenX,
        startScreenY: drag.startScreenY,
        startWindowX,
        startWindowY
      };
    }

    if (drag.started) {
      const nextX = this.dragSession.startWindowX + (drag.latestScreenX - this.dragSession.startScreenX);
      const nextY = this.dragSession.startWindowY + (drag.latestScreenY - this.dragSession.startScreenY);
      petWindow.setPosition(Math.round(nextX), Math.round(nextY), false);
      this.clampWindowToWorkArea(petWindow);
    }

    if (drag.ended) {
      await this.persistWindowPosition();
      this.dragSession = null;
    }
  }

  private async persistWindowPosition(): Promise<void> {
    const petWindow = this.window;
    if (petWindow === null || petWindow.isDestroyed()) return;
    const [x, y] = petWindow.getPosition();
    await this.options.onUpdateSettings({
      windowPosition: {
        x: Math.round(x),
        y: Math.round(y)
      }
    });
  }

  private async walkDesktopWindow(): Promise<void> {
    const petWindow = this.window;
    const runtime = this.runtime;
    if (petWindow === null || petWindow.isDestroyed()) {
      this.stopWalking();
      return;
    }

    const settings = this.options.getSettings();
    const pausedByInteraction =
      (settings.hoverPause && this.hovered) || this.contextMenuOpen || this.dragSession !== null;
    if (!settings.autonomousWalking || settings.reducedMotion || pausedByInteraction) {
      this.stopWalking();
      return;
    }

    const now = performance.now();
    const elapsedSeconds = Math.max(0, (now - this.lastWalkTickMs) / 1000);
    this.lastWalkTickMs = now;

    const [width] = petWindow.getSize();
    const [currentX, currentY] = petWindow.getPosition();
    const workArea = getPrimaryWorkArea(runtime?.screen);
    const minX = workArea.x + PET_WINDOW_MARGIN_PX;
    const maxX = Math.max(minX, workArea.x + workArea.width - width - PET_WINDOW_MARGIN_PX);
    let nextX = currentX + this.walkingDirection * settings.walkingSpeedPx * elapsedSeconds;

    if (nextX >= maxX) {
      nextX = maxX;
      this.walkingDirection = -1;
      await this.executeRendererMethod("setWalkingDirection", this.walkingDirection);
    } else if (nextX <= minX) {
      nextX = minX;
      this.walkingDirection = 1;
      await this.executeRendererMethod("setWalkingDirection", this.walkingDirection);
    }

    petWindow.setPosition(Math.round(nextX), currentY, false);
  }

  private async executeRendererMethod(methodName: string, ...args: readonly unknown[]): Promise<void> {
    const petWindow = this.window;
    if (petWindow === null || petWindow.isDestroyed()) return;
    const serializedArgs = args.map(toExecutableLiteral).join(", ");
    await petWindow.webContents.executeJavaScript(
      `window.PetsidianRenderer && window.PetsidianRenderer[${toExecutableLiteral(methodName)}](${serializedArgs});`,
      true
    );
  }
}
