type WindowPosition = {
  x: number;
  y: number;
};

type WorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ScreenPoint = {
  x: number;
  y: number;
};

type BoundsLike = WorkArea;

type BrowserWindowLike = {
  getPosition: () => [number, number];
  setPosition: (x: number, y: number, animate?: boolean) => void;
};

type ScreenLike = {
  getPrimaryDisplay: () => { workArea: WorkArea };
  getDisplayMatching?: (bounds: BoundsLike) => { workArea: WorkArea };
  getDisplayNearestPoint?: (point: ScreenPoint) => { workArea: WorkArea };
};

type ElectronRemoteLike = {
  getCurrentWindow?: () => BrowserWindowLike;
  screen?: ScreenLike;
};

type ContextBridgeLike = {
  exposeInMainWorld: (apiKey: string, api: unknown) => void;
};

type ElectronModuleLike = {
  contextBridge?: ContextBridgeLike;
  remote?: ElectronRemoteLike;
  screen?: ScreenLike;
};

type PetsidianNativeWindowBridge = {
  getWindowPosition: () => WindowPosition | null;
  setWindowPosition: (x: number, y: number) => boolean;
  getWorkAreaForPoint: (point: ScreenPoint) => WorkArea | null;
  getWorkAreaForBounds: (bounds: BoundsLike) => WorkArea | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBrowserWindowLike(value: unknown): value is BrowserWindowLike {
  return (
    isRecord(value) &&
    typeof value.getPosition === "function" &&
    typeof value.setPosition === "function"
  );
}

function isWorkArea(value: unknown): value is WorkArea {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height)
  );
}

function isScreenLike(value: unknown): value is ScreenLike {
  return (
    isRecord(value) &&
    typeof value.getPrimaryDisplay === "function" &&
    (value.getDisplayMatching === undefined ||
      typeof value.getDisplayMatching === "function") &&
    (value.getDisplayNearestPoint === undefined ||
      typeof value.getDisplayNearestPoint === "function")
  );
}

function readElectronRemote(value: unknown): ElectronRemoteLike | null {
  if (!isRecord(value)) {
    return null;
  }

  const remote: ElectronRemoteLike = {};
  if (typeof value.getCurrentWindow === "function") {
    remote.getCurrentWindow = value.getCurrentWindow as () => BrowserWindowLike;
  }
  if (isScreenLike(value.screen)) {
    remote.screen = value.screen;
  }
  return remote.getCurrentWindow ? remote : null;
}

function readContextBridge(value: unknown): ContextBridgeLike | null {
  return isRecord(value) && typeof value.exposeInMainWorld === "function"
    ? (value as ContextBridgeLike)
    : null;
}

function readPoint(value: unknown): ScreenPoint | null {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
    ? { x: value.x, y: value.y }
    : null;
}

function readBounds(value: unknown): BoundsLike | null {
  return isWorkArea(value) ? value : null;
}

function toPlainWorkArea(workArea: WorkArea): WorkArea {
  return {
    x: Math.round(workArea.x),
    y: Math.round(workArea.y),
    width: Math.round(workArea.width),
    height: Math.round(workArea.height)
  };
}

function installBridge(): void {
  const runtimeRequire =
    typeof require === "function"
      ? (require as (moduleName: string) => unknown)
      : null;
  if (runtimeRequire === null) {
    return;
  }

  let electronModule: ElectronModuleLike | null = null;
  try {
    electronModule = runtimeRequire("electron") as ElectronModuleLike;
  } catch {
    electronModule = null;
  }

  let remote = (() => {
    try {
      return readElectronRemote(runtimeRequire("@electron/remote"));
    } catch {
      return null;
    }
  })();
  if (remote === null) {
    remote = readElectronRemote(electronModule?.remote);
  }
  if (remote?.getCurrentWindow === undefined) {
    return;
  }

  const screen = remote.screen ?? (isScreenLike(electronModule?.screen) ? electronModule.screen : undefined);
  const contextBridge = readContextBridge(electronModule?.contextBridge);

  const bridge: PetsidianNativeWindowBridge = {
    getWindowPosition() {
      const currentWindow = remote?.getCurrentWindow?.();
      if (!isBrowserWindowLike(currentWindow)) {
        return null;
      }
      const [x, y] = currentWindow.getPosition();
      return isFiniteNumber(x) && isFiniteNumber(y)
        ? { x: Math.round(x), y: Math.round(y) }
        : null;
    },
    setWindowPosition(x, y) {
      const currentWindow = remote?.getCurrentWindow?.();
      if (!isBrowserWindowLike(currentWindow) || !isFiniteNumber(x) || !isFiniteNumber(y)) {
        return false;
      }
      currentWindow.setPosition(Math.round(x), Math.round(y), false);
      return true;
    },
    getWorkAreaForPoint(point) {
      const safePoint = readPoint(point);
      if (safePoint === null || screen === undefined) {
        return null;
      }
      if (typeof screen.getDisplayNearestPoint === "function") {
        return toPlainWorkArea(screen.getDisplayNearestPoint(safePoint).workArea);
      }
      return toPlainWorkArea(screen.getPrimaryDisplay().workArea);
    },
    getWorkAreaForBounds(bounds) {
      const safeBounds = readBounds(bounds);
      if (safeBounds === null || screen === undefined) {
        return null;
      }
      if (typeof screen.getDisplayMatching === "function") {
        return toPlainWorkArea(screen.getDisplayMatching(safeBounds).workArea);
      }
      return toPlainWorkArea(screen.getPrimaryDisplay().workArea);
    }
  };

  if (contextBridge !== null) {
    contextBridge.exposeInMainWorld("PetsidianNativeWindowBridge", bridge);
    return;
  }

  (
    globalThis as typeof globalThis & {
      PetsidianNativeWindowBridge?: PetsidianNativeWindowBridge;
    }
  ).PetsidianNativeWindowBridge = bridge;
}

installBridge();
