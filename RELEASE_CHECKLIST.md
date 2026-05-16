# Petsidian release checklist

Use this before publishing any GitHub release or submitting an update to the Obsidian Community directory.

## Metadata and policy

- [ ] `manifest.json`, `package.json`, and `versions.json` agree on the plugin version and minimum Obsidian version.
- [ ] `manifest.json.description` stays short, plain, under 250 characters, and ends with a period.
- [ ] `manifest.json.isDesktopOnly` stays `true`.
- [ ] Command IDs in source do not manually include the `petsidian` prefix.
- [ ] `README.md` still documents desktop-only behavior, network use, and file access outside the vault.
- [ ] `README.md` still states there is no telemetry, no ads, and no self-update mechanism.
- [ ] `LICENSE` exists and package metadata still says `GPL-3.0-or-later`.
- [ ] Bundled third-party assets and behavior derived from OpenPet remain attributed in the README.

## Product quality

- [ ] Local import still works for Codex pet packages, atlases, and supported static images.
- [ ] Website import still requires HTTPS and rejects localhost/private-network targets.
- [ ] Language switching updates both the settings tab and an already-open detached pet window.
- [ ] The detached pet still respects tight pointer bounds, right-click menu behavior, and host-window shutdown cleanup.
- [ ] Core command palette entries stay limited to the small daily-use set.

## Default checks

- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `git diff --check`

## Optional runtime checks

- [ ] `pnpm prepare:test-vault` when release validation needs a fresh linked vault.
- [ ] `pnpm smoke:obsidian` when detached-window or import runtime behavior changed.
- [ ] `pnpm smoke:obsidian:attached` when the shared test vault is already open.
- [ ] Manual Obsidian spot check for host-window close behavior, import flows, and localization polish before release-sensitive runtime changes ship.

## GitHub release

- [ ] Commit the release-ready root files before tagging.
- [ ] Create or push a tag that exactly matches `manifest.json.version` (for example `0.1.0`, not `v0.1.0`).
- [ ] Confirm the GitHub Actions release workflow attached `main.js`, `desktop-pet-preload.js`, `manifest.json`, `styles.css`, and the manual-install zip.
- [ ] Spot-check the manual-install zip by extracting it into `.obsidian/plugins/petsidian/`.
- [ ] If this is the first Community submission, sign into `community.obsidian.md`, connect GitHub, and submit the repository from the dashboard.
- [ ] If this is an update, verify the Community dashboard shows the new release as healthy after automated review.
