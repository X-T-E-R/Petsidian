import {
  ensureCommunityPluginEnabled,
  ensurePluginLink,
  launchObsidianForVault,
  listObsidianProcesses,
  prepareSmokeUserDataForVault,
  runLoggedCommand,
  setPluginVisibleForSmoke,
  stopProcessTree,
  waitForWindows,
  writeSmokeArtifact
} from "./test-vault-utils.mjs";

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
    const artifact = {
      passed: probe.success,
      processId,
      launchedAt: new Date().toISOString(),
      existingObsidianProcessIds: existingObsidian.map((processInfo) => processInfo.ProcessId),
      link,
      enabled,
      smokeUserData,
      probe
    };

    evidencePath = writeSmokeArtifact(artifact);

    if (!probe.success) {
      throw new Error(
        `Smoke test timed out before both the vault window and the detached pet window appeared. Evidence: ${evidencePath}`
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
