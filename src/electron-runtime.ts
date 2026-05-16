type RuntimeRequire = (moduleName: string) => unknown;

export type BrowserWindowOptions = {
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
    preload?: string;
  };
};

export type WorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DisplayLike = {
  workArea: WorkArea;
};

export type ScreenPointLike = {
  x: number;
  y: number;
};

export type ScreenLike = {
  getPrimaryDisplay: () => DisplayLike;
  getDisplayMatching?: (bounds: WorkArea) => DisplayLike;
  getDisplayNearestPoint?: (point: ScreenPointLike) => DisplayLike;
  getCursorScreenPoint?: () => ScreenPointLike;
};

export type WebContentsLike = {
  executeJavaScript: (script: string, userGesture?: boolean) => Promise<unknown>;
};

type IgnoreMouseEventsOptions = {
  forward?: boolean;
};

type BrowserWindowEventName = "close" | "closed";

export type BrowserWindowLike = {
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
  isFocused?: () => boolean;
  once: (event: BrowserWindowEventName, callback: () => void) => void;
  on?: (event: BrowserWindowEventName, callback: () => void) => void;
  removeListener?: (event: BrowserWindowEventName, callback: () => void) => void;
  setIgnoreMouseEvents?: (
    ignore: boolean,
    options?: IgnoreMouseEventsOptions
  ) => void;
};

export type BrowserWindowConstructor = new (
  options: BrowserWindowOptions
) => BrowserWindowLike;

export type OpenDialogOptions = {
  title?: string;
  properties?: string[];
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
};

export type OpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

export type DialogLike = {
  showOpenDialog: (
    browserWindow: BrowserWindowLike | null,
    options: OpenDialogOptions
  ) => Promise<OpenDialogResult>;
};

type ElectronRemoteLike = {
  BrowserWindow?: BrowserWindowConstructor;
  screen?: ScreenLike;
  dialog?: DialogLike;
  getCurrentWindow?: () => BrowserWindowLike;
};

type ElectronModuleLike = {
  remote?: ElectronRemoteLike;
  screen?: ScreenLike;
  dialog?: DialogLike;
};

export type DesktopRuntime = {
  BrowserWindow: BrowserWindowConstructor;
  screen?: ScreenLike;
  dialog?: DialogLike;
  getCurrentWindow?: () => BrowserWindowLike;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBrowserWindowConstructor(value: unknown): value is BrowserWindowConstructor {
  return typeof value === "function";
}

function isScreenLike(value: unknown): value is ScreenLike {
  return (
    isRecord(value) &&
    typeof value.getPrimaryDisplay === "function" &&
    (value.getDisplayMatching === undefined || typeof value.getDisplayMatching === "function") &&
    (value.getDisplayNearestPoint === undefined || typeof value.getDisplayNearestPoint === "function") &&
    (value.getCursorScreenPoint === undefined || typeof value.getCursorScreenPoint === "function")
  );
}

function isDialogLike(value: unknown): value is DialogLike {
  return isRecord(value) && typeof value.showOpenDialog === "function";
}

function readElectronRemote(value: unknown): ElectronRemoteLike | null {
  if (!isRecord(value)) return null;
  const remote: ElectronRemoteLike = {};
  if (isBrowserWindowConstructor(value.BrowserWindow)) {
    remote.BrowserWindow = value.BrowserWindow;
  }
  if (isScreenLike(value.screen)) {
    remote.screen = value.screen;
  }
  if (isDialogLike(value.dialog)) {
    remote.dialog = value.dialog;
  }
  if (typeof value.getCurrentWindow === "function") {
    remote.getCurrentWindow = value.getCurrentWindow as () => BrowserWindowLike;
  }
  return remote.BrowserWindow ? remote : null;
}

export function resolveRuntimeRequire(): RuntimeRequire {
  const globalWindow = window as Window & { require?: RuntimeRequire };
  if (typeof globalWindow.require !== "function") {
    throw new Error("Obsidian desktop did not expose window.require().");
  }
  return globalWindow.require;
}

export function resolveElectronRuntime(): DesktopRuntime {
  const runtimeRequire = resolveRuntimeRequire();
  const errors: string[] = [];

  try {
    const remote = readElectronRemote(runtimeRequire("@electron/remote"));
    if (remote?.BrowserWindow) {
      const runtime: DesktopRuntime = {
        BrowserWindow: remote.BrowserWindow
      };
      if (remote.screen !== undefined) runtime.screen = remote.screen;
      if (remote.dialog !== undefined) runtime.dialog = remote.dialog;
      if (remote.getCurrentWindow !== undefined) runtime.getCurrentWindow = remote.getCurrentWindow;
      return runtime;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const electron = runtimeRequire("electron") as ElectronModuleLike;
    const remote = readElectronRemote(electron.remote);
    if (remote?.BrowserWindow) {
      const runtime: DesktopRuntime = {
        BrowserWindow: remote.BrowserWindow
      };
      const screen = remote.screen ?? (isScreenLike(electron.screen) ? electron.screen : undefined);
      const dialog = remote.dialog ?? (isDialogLike(electron.dialog) ? electron.dialog : undefined);
      if (screen !== undefined) runtime.screen = screen;
      if (dialog !== undefined) runtime.dialog = dialog;
      if (remote.getCurrentWindow !== undefined) runtime.getCurrentWindow = remote.getCurrentWindow;
      return runtime;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  throw new Error(
    `Obsidian desktop did not expose Electron remote BrowserWindow APIs.${
      errors.length > 0 ? ` ${errors.join(" ")}` : ""
    }`
  );
}
