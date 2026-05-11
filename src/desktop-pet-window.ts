import {
  getPetRenderScale,
  getPetSpriteSize,
  PET_ANIMATIONS,
  PET_ATLAS,
  type PetActionAnimationId
} from "./pet/animation";
import { getCatalogPet, getPetSpritesheetUrl, PET_CATALOG } from "./pet/catalog";
import type { PetsidianSettings } from "./pet/settings";

type RuntimeRequire = (moduleName: string) => unknown;

type BrowserWindowConstructor = new (options: BrowserWindowOptions) => BrowserWindowLike;

type BrowserWindowOptions = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  show: boolean;
  frame: boolean;
  transparent: boolean;
  resizable: boolean;
  movable: boolean;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
  hasShadow: boolean;
  backgroundColor: string;
  title: string;
  webPreferences: {
    contextIsolation: boolean;
    nodeIntegration: boolean;
    sandbox: boolean;
  };
};

type WorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DisplayLike = {
  workArea: WorkArea;
};

type ScreenLike = {
  getPrimaryDisplay: () => DisplayLike;
};

type WebContentsLike = {
  executeJavaScript: (script: string, userGesture?: boolean) => Promise<unknown>;
};

type BrowserWindowLike = {
  webContents: WebContentsLike;
  loadURL: (url: string) => Promise<void> | void;
  show: () => void;
  hide: () => void;
  close: () => void;
  destroy: () => void;
  isDestroyed: () => boolean;
  setAlwaysOnTop: (flag: boolean, level?: string) => void;
  setSkipTaskbar: (skip: boolean) => void;
  setSize: (width: number, height: number, animate?: boolean) => void;
  setPosition: (x: number, y: number, animate?: boolean) => void;
  getPosition: () => [number, number];
  getSize: () => [number, number];
  once: (event: "closed", callback: () => void) => void;
};

type ElectronRemoteLike = {
  BrowserWindow: BrowserWindowConstructor;
  screen?: ScreenLike;
};

type ElectronModuleLike = {
  remote?: ElectronRemoteLike;
  screen?: ScreenLike;
};

type DesktopRuntime = {
  BrowserWindow: BrowserWindowConstructor;
  screen?: ScreenLike;
};

const PET_WINDOW_MARGIN_PX = 24;
const PET_WINDOW_BUBBLE_SPACE_PX = 96;
const WALK_INTERVAL_MS = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBrowserWindowConstructor(value: unknown): value is BrowserWindowConstructor {
  return typeof value === "function";
}

function isScreenLike(value: unknown): value is ScreenLike {
  if (!isRecord(value)) return false;
  return typeof value.getPrimaryDisplay === "function";
}

function readElectronRemote(value: unknown): ElectronRemoteLike | null {
  if (!isRecord(value) || !isBrowserWindowConstructor(value.BrowserWindow)) return null;
  const remote: ElectronRemoteLike = {
    BrowserWindow: value.BrowserWindow
  };
  if (isScreenLike(value.screen)) {
    remote.screen = value.screen;
  }
  return remote;
}

function resolveRuntimeRequire(): RuntimeRequire {
  const globalWindow = window as Window & { require?: RuntimeRequire };
  if (typeof globalWindow.require !== "function") {
    throw new Error("Obsidian desktop did not expose window.require().");
  }
  return globalWindow.require;
}

function resolveElectronRuntime(): DesktopRuntime {
  const runtimeRequire = resolveRuntimeRequire();
  const errors: string[] = [];

  try {
    const remote = readElectronRemote(runtimeRequire("@electron/remote"));
    if (remote !== null) return remote;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const electron = runtimeRequire("electron") as ElectronModuleLike;
    const remote = readElectronRemote(electron.remote);
    if (remote !== null) {
      const runtime: DesktopRuntime = {
        BrowserWindow: remote.BrowserWindow,
      };
      const screen = remote.screen ?? (isScreenLike(electron.screen) ? electron.screen : undefined);
      if (screen !== undefined) {
        runtime.screen = screen;
      }
      return runtime;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  throw new Error(
    `Obsidian desktop did not expose Electron remote BrowserWindow APIs.${errors.length > 0 ? ` ${errors.join(" ")}` : ""}`
  );
}

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

function buildRendererHtml(settings: PetsidianSettings): string {
  const pet = getCatalogPet(settings.activePetId, PET_CATALOG);
  const spriteSize = getPetSpriteSize(settings.scale);
  const renderScale = getPetRenderScale(settings.scale);
  const rendererPayload = {
    atlas: PET_ATLAS,
    animations: PET_ANIMATIONS,
    settings,
    pet: {
      displayName: pet.displayName,
      spritesheetUrl: getPetSpritesheetUrl(pet)
    },
    spriteSize,
    renderScale
  };

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
      html,
      body {
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
        transition:
          opacity 160ms ease,
          transform 160ms ease;
        pointer-events: none;
      }

      #bubble.visible {
        opacity: 1;
        transform: translateY(0);
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
        background-image: url("${getPetSpritesheetUrl(pet)}");
        background-size: ${PET_ATLAS.width * renderScale}px ${PET_ATLAS.height * renderScale}px;
        cursor: pointer;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
        transition: transform 160ms ease;
      }

      #pet:hover,
      #pet:focus-visible {
        outline: none;
        transform: translateY(-2px);
      }

      body.reduced-motion #bubble,
      body.reduced-motion #pet {
        transition: none;
      }
    </style>
  </head>
  <body>
    <main id="root" aria-live="polite">
      <div id="bubble"></div>
      <button id="pet" type="button" aria-label="Petsidian desktop pet"></button>
    </main>
    <script>
      (() => {
        "use strict";

        const state = ${toExecutableLiteral(rendererPayload)};
        const petButton = document.getElementById("pet");
        const bubble = document.getElementById("bubble");
        let activeAnimationId = "idle";
        let animationStartedAtMs = performance.now();
        let actionEndsAtMs = 0;
        let bubbleTimerId = null;
        let walkingDirection = 1;

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

        function applySettings(nextSettings) {
          state.settings = { ...state.settings, ...nextSettings };
          const spriteWidth = Math.ceil(state.atlas.cellWidth * Math.max(0.25, state.settings.scale * 0.75));
          const spriteHeight = Math.ceil(state.atlas.cellHeight * Math.max(0.25, state.settings.scale * 0.75));
          petButton.style.width = spriteWidth + "px";
          petButton.style.height = spriteHeight + "px";
          petButton.style.backgroundSize =
            (state.atlas.width * Math.max(0.25, state.settings.scale * 0.75)) + "px " +
            (state.atlas.height * Math.max(0.25, state.settings.scale * 0.75)) + "px";
          document.body.classList.toggle("reduced-motion", Boolean(state.settings.reducedMotion));
        }

        function hideBubble() {
          bubble.classList.remove("visible");
        }

        function showBubble(text, ttlMs) {
          if (!state.settings.bubblesEnabled) return;
          const normalized = String(text || "").trim();
          if (normalized.length === 0) return;
          bubble.textContent = normalized.slice(0, 512);
          bubble.classList.add("visible");
          if (bubbleTimerId !== null) window.clearTimeout(bubbleTimerId);
          bubbleTimerId = window.setTimeout(hideBubble, ttlMs || state.settings.bubbleTtlMs || 4000);
        }

        function playAction(animationId, bubbleText, ttlMs) {
          activeAnimationId = typeof animationId === "string" && state.animations[animationId] ? animationId : "waving";
          const now = performance.now();
          animationStartedAtMs = now;
          actionEndsAtMs = now + getAnimationDuration(getAnimation(activeAnimationId));
          if (bubbleText !== undefined && bubbleText !== null) showBubble(bubbleText, ttlMs);
        }

        function renderFrame(now) {
          if (activeAnimationId !== "idle" && now >= actionEndsAtMs) {
            activeAnimationId = "idle";
            animationStartedAtMs = now;
            actionEndsAtMs = 0;
          }

          const animationId =
            state.settings.autonomousWalking && !state.settings.reducedMotion && activeAnimationId === "idle"
              ? walkingDirection > 0
                ? "running-right"
                : "running-left"
              : activeAnimationId;
          const animation = getAnimation(animationId);
          const elapsedMs = state.settings.reducedMotion ? 0 : now - animationStartedAtMs;
          const frame = state.settings.reducedMotion ? 0 : getFrameAtTime(animation, elapsedMs);
          const offset = getFrameOffset(animation, frame);
          petButton.style.backgroundPosition = offset.x + "px " + offset.y + "px";
          window.requestAnimationFrame(renderFrame);
        }

        petButton.addEventListener("click", () => {
          const animationId = state.settings.clickActionMode === "random"
            ? pickActionFromPool()
            : state.settings.clickAction;
          playAction(animationId, "Hi from Petsidian!", state.settings.bubbleTtlMs);
        });

        petButton.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          showBubble("Use Obsidian commands to control Petsidian.", state.settings.bubbleTtlMs);
        });

        window.PetsidianRenderer = {
          updateSettings: applySettings,
          playAction,
          say: showBubble,
          setWalkingDirection: (direction) => {
            walkingDirection = direction >= 0 ? 1 : -1;
          }
        };

        applySettings(state.settings);
        window.requestAnimationFrame(renderFrame);
      })();
    </script>
  </body>
</html>`;
}

export class DesktopPetWindow {
  private readonly getSettings: () => PetsidianSettings;
  private runtime: DesktopRuntime | null = null;
  private window: BrowserWindowLike | null = null;
  private walkingTimerId: number | null = null;
  private walkingDirection = 1;
  private lastWalkTickMs = 0;

  constructor(getSettings: () => PetsidianSettings) {
    this.getSettings = getSettings;
  }

  async show(): Promise<void> {
    const petWindow = await this.ensureWindow();
    this.applyNativeSettings(petWindow);
    this.clampWindowToWorkArea(petWindow);
    petWindow.show();
    await this.refreshFromSettings();
  }

  hide(): void {
    this.stopWalking();
    if (this.window !== null && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  destroy(): void {
    this.stopWalking();
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

    const settings = this.getSettings();
    const size = getWindowSize(settings);
    petWindow.setSize(size.width, size.height, false);
    this.applyNativeSettings(petWindow);
    this.clampWindowToWorkArea(petWindow);
    await this.executeRendererMethod("updateSettings", settings);
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
    const settings = this.getSettings();
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
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    petWindow.once("closed", () => {
      if (this.window === petWindow) {
        this.window = null;
      }
      this.stopWalking();
    });

    this.window = petWindow;
    await petWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildRendererHtml(settings))}`);
    return petWindow;
  }

  private applyNativeSettings(petWindow: BrowserWindowLike): void {
    const settings = this.getSettings();
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
    const fallback = buildInitialPosition(this.getSettings(), workArea);
    const nextX = Number.isFinite(currentX)
      ? Math.min(Math.max(currentX, minX), maxX)
      : fallback.x;
    const nextY = Number.isFinite(currentY)
      ? Math.min(Math.max(currentY, minY), maxY)
      : fallback.y;
    if (nextX !== currentX || nextY !== currentY) {
      petWindow.setPosition(Math.round(nextX), Math.round(nextY), false);
    }
  }

  private updateWalkingState(): void {
    const settings = this.getSettings();
    if (!settings.autonomousWalking || settings.reducedMotion || this.window === null) {
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

  private async walkDesktopWindow(): Promise<void> {
    const petWindow = this.window;
    const runtime = this.runtime;
    if (petWindow === null || petWindow.isDestroyed()) {
      this.stopWalking();
      return;
    }

    const settings = this.getSettings();
    if (!settings.autonomousWalking || settings.reducedMotion) {
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
