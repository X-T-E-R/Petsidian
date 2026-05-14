import {
  ensureCommunityPluginEnabled,
  ensurePluginLink,
  dragWindowHandle,
  launchObsidianForVault,
  listObsidianProcesses,
  prepareSmokeUserDataForVault,
  rightClickWindowHandle,
  runLoggedCommand,
  sendEscapeToWindow,
  setPluginVisibleForSmoke,
  stopProcessTree,
  waitForPetWindowMove,
  waitForPetWindowTitle,
  waitForWindows,
  writeSmokeArtifact
} from "./test-vault-utils.mjs";

async function probeDetachedPetInteractions(processId, petWindow) {
  const contextMenu = {
    attempted: false,
    opened: false,
    closed: false,
    openProbe: null,
    closeProbe: null
  };
  const drag = {
    attempted: false,
    moved: false,
    probe: null
  };

  if (!petWindow?.handle || !petWindow?.rect) {
    return {
      contextMenu,
      drag,
      passed: false,
      reason: "Pet window handle or rectangle was not available."
    };
  }

  contextMenu.attempted = true;
  rightClickWindowHandle(petWindow.handle);
  contextMenu.openProbe = await waitForPetWindowTitle(
    processId,
    "Petsidian Desktop Pet - Menu",
    5000
  );
  contextMenu.opened = contextMenu.openProbe.success;

  if (contextMenu.opened) {
    sendEscapeToWindow(petWindow.handle);
    contextMenu.closeProbe = await waitForPetWindowTitle(
      processId,
      "Petsidian Desktop Pet",
      5000
    );
    contextMenu.closed = contextMenu.closeProbe.success;
  }

  const latestPetWindow =
    contextMenu.closeProbe?.petWindow ??
    contextMenu.openProbe?.petWindow ??
    petWindow;
  const originalRect = latestPetWindow.rect ?? petWindow.rect;
  drag.attempted = true;
  dragWindowHandle(latestPetWindow.handle ?? petWindow.handle, -80, -36);
  drag.probe = await waitForPetWindowMove(processId, originalRect, 5000);
  drag.moved = drag.probe.success;

  return {
    contextMenu,
    drag,
    passed: contextMenu.opened && contextMenu.closed && drag.moved
  };
}

async function main() {
  const existingObsidian = listObsidianProcesses();
  await runLoggedCommand("pnpm", ["build"], "pnpm build");
  const link = ensurePluginLink();
  const enabled = ensureCommunityPluginEnabled();
  const smokeUserData = prepareSmokeUserDataForVault();
  const restoreVisibility = setPluginVisibleForSmoke();
  let child = null;
  let evidencePath = null;

  try {
    child = launchObsidianForVault({ prepare: false });
    const processId = child.pid;
    if (typeof processId !== "number") {
      throw new Error("Failed to determine the launched Obsidian PID.");
    }

    const probe = await waitForWindows(processId, 45000);
    const interactionProbe = probe.success
      ? await probeDetachedPetInteractions(processId, probe.petWindow)
      : null;
    const passed = probe.success && interactionProbe?.passed === true;
    const artifact = {
      passed,
      processId,
      launchedAt: new Date().toISOString(),
      existingObsidianProcessIds: existingObsidian.map((processInfo) => processInfo.ProcessId),
      link,
      enabled,
      smokeUserData,
      probe,
      interactionProbe
    };

    evidencePath = writeSmokeArtifact(artifact);

    if (!passed) {
      throw new Error(
        `Smoke test failed before the detached pet window and its interaction probes completed. Evidence: ${evidencePath}`
      );
    }

    console.log(
      JSON.stringify(
        {
          passed: true,
          evidencePath,
          processId,
          mainWindowTitle: probe.mainWindow?.title ?? null,
          petWindowTitle: probe.petWindow?.title ?? null,
          contextMenuObserved: interactionProbe?.contextMenu.opened ?? false,
          dragObserved: interactionProbe?.drag.moved ?? false,
          elapsedMs: probe.elapsedMs
        },
        null,
        2
      )
    );
  } finally {
    restoreVisibility();
    if (child?.pid) {
      stopProcessTree(child.pid);
    }
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const referencedEvidencePath = /Evidence:\s*(.+)$/u.exec(message)?.[1] ?? null;
  const evidencePath = writeSmokeArtifact({
    passed: false,
    failedAt: new Date().toISOString(),
    error: message,
    referencedEvidencePath
  });

  console.error(
    JSON.stringify(
      {
        passed: false,
        evidencePath,
        error: message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}
