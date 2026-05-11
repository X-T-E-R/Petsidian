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

The build emits `main.js` next to `manifest.json` and `styles.css`.

## Manual Install For Local Testing

1. Build the plugin.
2. Copy this folder, or at least `manifest.json`, `main.js`, and `styles.css`, into a test vault at `.obsidian/plugins/petsidian/`.
3. Open the vault in Obsidian desktop, reload plugins, and enable Petsidian.
4. Use the Petsidian commands or settings tab to show the detached pet.

Use a test vault while developing plugins. Runtime behavior must be smoke-tested in Obsidian desktop because the detached window relies on Electron APIs exposed by that host.

## Release Artifacts

Obsidian community plugin releases normally attach:

- `manifest.json`
- `main.js`
- `styles.css`

Additional binary pet assets are intentionally not required by this MVP. The bundled Nia fallback is generated as a data URL from TypeScript so the first build does not depend on unverified extra release asset installation.
