import {
  closeWindowHandle,
  ensureCommunityPluginEnabled,
  ensurePluginLink,
  findRunningTestVaultWindow,
  runLoggedCommand,
  sendCtrlRToWindow,
  setPluginVisibleForSmoke,
  waitForWindows,
  writeSmokeArtifact
} from "./test-vault-utils.mjs";

async function main() {
  await runLoggedCommand("pnpm", ["build"], "pnpm build");
  const link = ensurePluginLink();
  const enabled = ensureCommunityPluginEnabled();
  const running = findRunningTestVaultWindow();

  if (running === null) {
    throw new Error(
      "No running Obsidian window for the configured test vault was found. Use pnpm smoke:obsidian after closing other Obsidian instances, or open the test vault first."
    );
  }

  const restoreVisibility = setPluginVisibleForSmoke();
  let evidencePath = null;

  try {
    sendCtrlRToWindow(running.mainWindow.handle);
    const probe = await waitForWindows(running.processId, 45000);
    const artifact = {
      passed: probe.success,
      attached: true,
      processId: running.processId,
      startedAt: new Date().toISOString(),
      link,
      enabled,
      initialMainWindow: running.mainWindow,
      probe
    };

    evidencePath = writeSmokeArtifact(artifact);

    if (!probe.success) {
      throw new Error(
        `Attached smoke test timed out before both the vault window and the detached pet window appeared. Evidence: ${evidencePath}`
      );
    }

    if (probe.petWindow?.handle) {
      closeWindowHandle(probe.petWindow.handle);
    }

    console.log(
      JSON.stringify(
        {
          passed: true,
          attached: true,
          evidencePath,
          processId: running.processId,
          mainWindowTitle: probe.mainWindow?.title ?? null,
          petWindowTitle: probe.petWindow?.title ?? null,
          petWindowClosedAfterProbe: Boolean(probe.petWindow?.handle),
          elapsedMs: probe.elapsedMs
        },
        null,
        2
      )
    );
  } finally {
    restoreVisibility();
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const evidencePath = writeSmokeArtifact({
    passed: false,
    attached: true,
    failedAt: new Date().toISOString(),
    error: message
  });

  console.error(
    JSON.stringify(
      {
        passed: false,
        attached: true,
        evidencePath,
        error: message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}
