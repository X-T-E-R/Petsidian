# Petsidian

Petsidian is a desktop-only Obsidian plugin that hosts a detached desktop pet. Obsidian owns the plugin lifecycle, settings, and commands; the pet itself lives in a separate transparent Electron window outside the main Obsidian window.

## What It Is

- A detached transparent desktop pet window for Obsidian desktop.
- A strict TypeScript Obsidian plugin bundled with esbuild.
- A small MVP that adapts OpenPet's portable animation atlas, action ids, companion event types, bubbles, and settings concepts.

## What It Is Not

Petsidian is not a mobile or browser plugin. It depends on Obsidian desktop's Electron/Node runtime and sets `isDesktopOnly` to `true`.

Petsidian does not provide full OpenPet/Tauri parity. In particular, the MVP does not include a tray menu, a localhost HTTP API, an MCP bridge, or verified desktop click-through behavior.

## Features

- Toggleable detached pet window created with Electron `BrowserWindow`.
- Transparent frameless desktop window with always-on-top and skip-taskbar settings.
- Generated bundled `nia` atlas fallback with the OpenPet atlas geometry.
- Click action with fixed or random action selection.
- Speech bubbles with configurable duration.
- Optional autonomous desktop walking within the primary display work area.
- Commands for show, hide, toggle, wave, sample speech, direct actions, and companion events.
- Settings tab using Obsidian `PluginSettingTab` and `loadData()` / `saveData()`.
- Scoped CSS classes prefixed with `petsidian-`.

## Build

```bash
pnpm install
pnpm typecheck
pnpm build
```

The build emits the local-test/install payload in `dist/`:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`
- `dist/versions.json`

`manifest.json`, `styles.css`, and `versions.json` stay at the repository root as source files and are copied into `dist/` on each build.

## Local Test Vault Workflow

For the real test vault at `C:\Users\xxoy1\OneDrive\Obsidian\testVault\测试仓库`:

```bash
pnpm build
pnpm link:test-vault
pnpm enable:test-vault-plugin
```

The link step points:

```text
C:\Users\xxoy1\OneDrive\Obsidian\testVault\测试仓库\.obsidian\plugins\petsidian
-> C:\Programs\petsidian\dist
```

The script prefers a directory symbolic link and falls back to a junction on Windows when symbolic-link permissions are unavailable. If a real non-link plugin directory already exists, the script backs it up with a timestamped `.backup-*` suffix instead of deleting it.

You can run both setup steps together with:

```bash
pnpm prepare:test-vault
```

## Automated Obsidian Smoke Test

```bash
pnpm smoke:obsidian
```

The smoke script will:

1. Build the plugin into `dist/`.
2. Refresh the test-vault plugin link.
3. Ensure `petsidian` is present in `.obsidian/community-plugins.json` without removing existing plugins.
4. Temporarily force `visible: true` in the plugin data so the detached pet window should appear.
5. Launch `Obsidian.exe` against the test vault.
6. Wait for both the vault window and the detached `Petsidian Desktop Pet` window.
7. Write JSON evidence to `artifacts/obsidian-smoke/latest.json`.
8. Close only the Obsidian process tree started by the smoke script, then restore the prior plugin visibility setting.

The fresh smoke runner uses an isolated Obsidian user-data directory under
`artifacts/obsidian-smoke/user-data`, so it can run while another normal
Obsidian instance is open. Before launch it copies the default Obsidian
`Local Storage` directory into the isolated profile, excluding lock files, so
the isolated profile keeps the existing community-plugin consent state needed
for real plugin loading.

The smoke test is designed for CLI verification, but a manual visual pass is still recommended when changing renderer details, transparency behavior, or drag/movement behavior.

If the configured test vault is already open in Obsidian, use the attached smoke
runner instead:

```bash
pnpm smoke:obsidian:attached
```

The attached runner builds, refreshes the `dist/` link, enables the plugin,
temporarily sets `visible: true`, sends a reload shortcut to the already-open
test-vault window, waits for the detached `Petsidian Desktop Pet` window, writes
JSON evidence, and closes only the pet window it observed.

## Manual Install For Local Testing

1. Build the plugin.
2. Copy the contents of `dist/`, or symlink `dist/` into `.obsidian/plugins/petsidian/`.
3. Open the vault in Obsidian desktop, reload plugins, and enable Petsidian.
4. Use the Petsidian commands or settings tab to show the detached pet.

Use a test vault while developing plugins. Runtime behavior must be smoke-tested in Obsidian desktop because the detached window relies on Electron APIs exposed by that host.

## Release Artifacts

Obsidian community plugin releases normally attach:

- `manifest.json`
- `main.js`
- `styles.css`

Additional binary pet assets are intentionally not required by this MVP. The bundled Nia fallback is generated as a data URL from TypeScript so the first build does not depend on unverified extra release asset installation.
