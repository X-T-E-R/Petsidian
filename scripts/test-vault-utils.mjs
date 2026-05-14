import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(scriptDir, "..");
export const distDir = resolve(repoRoot, "dist");
export const manifestPath = resolve(repoRoot, "manifest.json");
export const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
export const pluginId = String(manifest.id);
export const requiredDistFiles = [
  resolve(distDir, "main.js"),
  resolve(distDir, "manifest.json"),
  resolve(distDir, "styles.css")
];
export const testVaultPath = "C:\\Users\\xxoy1\\OneDrive\\Obsidian\\testVault\\测试仓库";
export const testVaultName = basename(testVaultPath);
export const obsidianConfigDir = resolve(testVaultPath, ".obsidian");
export const pluginsDir = resolve(obsidianConfigDir, "plugins");
export const pluginLinkPath = resolve(pluginsDir, pluginId);
export const communityPluginsPath = resolve(obsidianConfigDir, "community-plugins.json");
export const obsidianExePath = "C:\\Users\\xxoy1\\AppData\\Local\\Programs\\Obsidian\\Obsidian.exe";
export const petWindowTitle = "Petsidian Desktop Pet";
export const smokeArtifactsDir = resolve(repoRoot, "artifacts", "obsidian-smoke");
export const smokeUserDataDir = resolve(smokeArtifactsDir, "user-data");
export const smokeVaultId = "8094342c1efc50c0";

function timestampSlug(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const padMs = (value) => String(value).padStart(3, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") + "-" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("") + "-" + padMs(date.getMilliseconds());
}

function stripLongPathPrefix(pathValue) {
  return String(pathValue).replace(/^\\\\\?\\/, "");
}

function normalizePath(pathValue) {
  return stripLongPathPrefix(pathValue).replace(/\//g, "\\").toLowerCase();
}

function samePath(left, right) {
  return normalizePath(realpathSync(left)) === normalizePath(realpathSync(right));
}

function readJsonFile(pathValue, fallback) {
  if (!existsSync(pathValue)) return fallback;
  return JSON.parse(readFileSync(pathValue, "utf8"));
}

function writeJsonFile(pathValue, value) {
  mkdirSync(dirname(pathValue), { recursive: true });
  writeFileSync(pathValue, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function ensureDistArtifactsExist() {
  const missing = requiredDistFiles.filter((pathValue) => !existsSync(pathValue));
  if (missing.length > 0) {
    throw new Error(
      `Missing dist artifacts: ${missing.join(", ")}. Run "pnpm build" first.`
    );
  }
}

export function ensurePluginLink() {
  ensureDistArtifactsExist();
  mkdirSync(pluginsDir, { recursive: true });

  let backupPath = null;
  let action = "created";

  if (existsSync(pluginLinkPath)) {
    const stats = lstatSync(pluginLinkPath);
    if (stats.isSymbolicLink()) {
      try {
        if (samePath(pluginLinkPath, distDir)) {
          return {
            action: "kept",
            backupPath: null,
            created: false,
            linkPath: pluginLinkPath,
            linkType: "existing-link",
            targetPath: distDir
          };
        }
      } catch {
        // Fall through and recreate the link when the target is stale or unreadable.
      }
      rmSync(pluginLinkPath, { recursive: true, force: true });
      action = "recreated";
    } else {
      backupPath = `${pluginLinkPath}.backup-${timestampSlug()}`;
      renameSync(pluginLinkPath, backupPath);
      action = "backed-up-and-created";
    }
  }

  try {
    symlinkSync(distDir, pluginLinkPath, "dir");
    return {
      action,
      backupPath,
      created: true,
      linkPath: pluginLinkPath,
      linkType: "symbolic-link",
      targetPath: distDir
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "EPERM" && code !== "EACCES" && code !== "UNKNOWN") {
      throw error;
    }
  }

  symlinkSync(distDir, pluginLinkPath, "junction");
  return {
    action,
    backupPath,
    created: true,
    linkPath: pluginLinkPath,
    linkType: "junction",
    targetPath: distDir
  };
}

export function ensureCommunityPluginEnabled() {
  const existing = readJsonFile(communityPluginsPath, []);
  const plugins = Array.isArray(existing) ? [...existing] : [];

  if (!plugins.includes(pluginId)) {
    plugins.push(pluginId);
    writeJsonFile(communityPluginsPath, plugins);
    return {
      changed: true,
      pluginId,
      plugins
    };
  }

  return {
    changed: false,
    pluginId,
    plugins
  };
}

export function setPluginVisibleForSmoke() {
  const dataPath = resolve(distDir, "data.json");
  const originalExists = existsSync(dataPath);
  const originalText = originalExists ? readFileSync(dataPath, "utf8") : null;
  const current = originalExists ? JSON.parse(originalText) : {};
  const next = {
    ...current,
    visible: true
  };
  writeJsonFile(dataPath, next);

  return () => {
    if (originalExists && originalText !== null) {
      writeFileSync(dataPath, originalText, "utf8");
      return;
    }
    if (existsSync(dataPath)) {
      rmSync(dataPath, { force: true });
    }
  };
}

export function ensureSmokeArtifactsDir() {
  mkdirSync(smokeArtifactsDir, { recursive: true });
  return smokeArtifactsDir;
}

export function writeSmokeArtifact(payload) {
  ensureSmokeArtifactsDir();
  const filePath = resolve(smokeArtifactsDir, `smoke-${timestampSlug()}.json`);
  writeJsonFile(filePath, payload);
  writeJsonFile(resolve(smokeArtifactsDir, "latest.json"), payload);
  return filePath;
}

function quoteWindowsCommandArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

export function runLoggedCommand(command, args, label = `${command} ${args.join(" ")}`) {
  return new Promise((resolvePromise, rejectPromise) => {
    const childCommand = process.platform === "win32" ? "cmd.exe" : command;
    const childArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsCommandArg).join(" ")]
        : args;

    const child = spawn(childCommand, childArgs, {
      cwd: repoRoot,
      shell: false,
      stdio: "inherit",
      windowsHide: false
    });

    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(`${label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`)
      );
    });
  });
}

function runPowerShell(command) {
  const utf8Command = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $OutputEncoding = [System.Text.UTF8Encoding]::new(); ${command}`;
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", utf8Command],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr || `PowerShell command failed: ${command}`);
  }

  return result.stdout.trim();
}

export function listObsidianProcesses() {
  const json = runPowerShell(
    "$items = Get-CimInstance Win32_Process -Filter \"Name = 'Obsidian.exe'\" | Select-Object ProcessId, ExecutablePath, CommandLine; $items | ConvertTo-Json -Compress"
  );

  if (json.length === 0) return [];

  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function getProcessInfo(processId) {
  const json = runPowerShell(
    `try { Get-Process -Id ${processId} | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle, StartTime, Path | ConvertTo-Json -Compress } catch { '' }`
  );

  if (json.length === 0) return null;
  return JSON.parse(json);
}

export function getWindowsForProcess(processId) {
  const command = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class PetsidianWindowProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll")]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
  [DllImport("user32.dll")]
  public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@;
$targetPid = ${processId};
$windows = New-Object System.Collections.Generic.List[object];
[PetsidianWindowProbe]::EnumWindows({
  param($hWnd, $lParam)
  $windowProcessId = [uint32]0
  [void][PetsidianWindowProbe]::GetWindowThreadProcessId($hWnd, [ref]$windowProcessId)
  if ($windowProcessId -eq $targetPid) {
    $length = [PetsidianWindowProbe]::GetWindowTextLength($hWnd)
    $builder = New-Object System.Text.StringBuilder ($length + 1)
    [void][PetsidianWindowProbe]::GetWindowText($hWnd, $builder, $builder.Capacity)
    $windows.Add([pscustomobject]@{
      handle = $hWnd.ToInt64()
      title = $builder.ToString()
      visible = [PetsidianWindowProbe]::IsWindowVisible($hWnd)
    }) | Out-Null
  }
  return $true
}, [IntPtr]::Zero) | Out-Null
$windows | ConvertTo-Json -Compress
`;

  const json = runPowerShell(command);
  if (json.length === 0) return [];
  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function closeWindowHandle(windowHandle) {
  const command = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PetsidianCloseWindow {
  [DllImport("user32.dll")]
  public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@;
[void][PetsidianCloseWindow]::PostMessage([IntPtr]${windowHandle}, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
`;
  runPowerShell(command);
}

export function focusWindowHandle(windowHandle) {
  const command = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PetsidianFocusWindow {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$handle = [IntPtr]${windowHandle}
[void][PetsidianFocusWindow]::ShowWindow($handle, 9)
[void][PetsidianFocusWindow]::SetForegroundWindow($handle)
`;
  runPowerShell(command);
}

export function sendCtrlRToWindow(windowHandle) {
  focusWindowHandle(windowHandle);
  const command = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 350
[System.Windows.Forms.SendKeys]::SendWait("^r")
`;
  runPowerShell(command);
}

export function findRunningTestVaultWindow() {
  const processes = listObsidianProcesses();
  for (const processInfo of processes) {
    const processId = Number(processInfo.ProcessId);
    if (!Number.isFinite(processId)) continue;
    const windows = getWindowsForProcess(processId);
    const mainWindow = windows.find((windowInfo) =>
      typeof windowInfo.title === "string" && windowInfo.title.includes(testVaultName)
    );
    if (mainWindow) {
      return {
        processId,
        processInfo,
        windows,
        mainWindow
      };
    }
  }
  return null;
}

export async function waitForWindows(processId, timeoutMs = 45000) {
  const startedAt = Date.now();
  let lastProcess = null;
  let lastWindows = [];

  while (Date.now() - startedAt <= timeoutMs) {
    lastProcess = getProcessInfo(processId);
    if (lastProcess === null) {
      break;
    }

    lastWindows = getWindowsForProcess(processId);
    const mainWindow = lastWindows.find((windowInfo) =>
      typeof windowInfo.title === "string" && windowInfo.title.includes(testVaultName)
    );
    const petWindow = lastWindows.find(
      (windowInfo) => typeof windowInfo.title === "string" && windowInfo.title === petWindowTitle
    );

    if (mainWindow && petWindow) {
      return {
        success: true,
        process: lastProcess,
        windows: lastWindows,
        mainWindow,
        petWindow,
        elapsedMs: Date.now() - startedAt
      };
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }

  return {
    success: false,
    process: lastProcess,
    windows: lastWindows,
    mainWindow:
      lastWindows.find((windowInfo) =>
        typeof windowInfo.title === "string" && windowInfo.title.includes(testVaultName)
      ) ?? null,
    petWindow:
      lastWindows.find(
        (windowInfo) => typeof windowInfo.title === "string" && windowInfo.title === petWindowTitle
      ) ?? null,
    elapsedMs: Date.now() - startedAt
  };
}

function copyDirectoryWithRobocopy(sourcePath, targetPath, label) {
  rmSync(targetPath, { recursive: true, force: true });
  const result = spawnSync(
    "robocopy",
    [sourcePath, targetPath, "/E", "/XF", "LOCK", "/R:1", "/W:1"],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );

  const exitCode = result.status ?? 1;
  if (exitCode > 7) {
    const details = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`${label} copy failed with robocopy exit code ${exitCode}.${details ? ` ${details}` : ""}`);
  }

  return {
    copied: true,
    exitCode,
    sourcePath,
    targetPath
  };
}

function seedSmokeCommunityPluginState() {
  const appDataPath = process.env.APPDATA;
  if (!appDataPath) {
    return {
      copied: false,
      reason: "APPDATA is not set; isolated Obsidian may not have community-plugin consent state."
    };
  }

  const sourcePath = resolve(appDataPath, "obsidian", "Local Storage");
  const targetPath = resolve(smokeUserDataDir, "Local Storage");
  if (!existsSync(sourcePath)) {
    return {
      copied: false,
      reason: `Default Obsidian Local Storage was not found at ${sourcePath}.`
    };
  }

  return copyDirectoryWithRobocopy(
    sourcePath,
    targetPath,
    "Obsidian Local Storage community-plugin state"
  );
}

export function prepareSmokeUserDataForVault() {
  mkdirSync(smokeUserDataDir, { recursive: true });
  const communityPluginState = seedSmokeCommunityPluginState();
  writeJsonFile(resolve(smokeUserDataDir, "obsidian.json"), {
    vaults: {
      [smokeVaultId]: {
        path: testVaultPath,
        ts: Date.now(),
        open: true
      }
    },
    openSchemes: {}
  });

  return {
    smokeUserDataDir,
    smokeVaultId,
    communityPluginState
  };
}

export function launchObsidianForVault(options = {}) {
  if (!existsSync(obsidianExePath)) {
    throw new Error(`Obsidian executable not found at ${obsidianExePath}`);
  }

  if (options.prepare !== false) {
    prepareSmokeUserDataForVault();
  }

  const child = spawn(obsidianExePath, [`--user-data-dir=${smokeUserDataDir}`], {
    cwd: dirname(obsidianExePath),
    detached: false,
    shell: false,
    stdio: "ignore",
    windowsHide: false
  });

  child.unref();
  return child;
}

export function stopProcessTree(processId) {
  const result = spawnSync(
    "taskkill",
    ["/PID", String(processId), "/T", "/F"],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    const details = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    if (details && !details.toLowerCase().includes("not found")) {
      throw new Error(details);
    }
  }
}
