import { App } from "obsidian";
import { reportAdapterFeedback, countCollection, getRegisteredPlugin, isRecord, type AdapterHost } from "./shared";

type DataviewApi = {
  page(path: string, originFile?: string): Record<string, unknown> | undefined;
};

function getDataviewApi(app: App): DataviewApi | null {
  const plugin = getRegisteredPlugin(app, "dataview");
  if (!isRecord(plugin)) {
    return null;
  }

  const api = plugin.api;
  if (!isRecord(api)) {
    return null;
  }

  const page = api.page;
  if (typeof page !== "function") {
    return null;
  }

  return {
    page: (path, originFile) => {
      const value = (page as (path: string, originFile?: string) => unknown)(path, originFile);
      return isRecord(value) ? value : undefined;
    }
  };
}

export async function reportDataviewActiveFileHint(host: AdapterHost): Promise<void> {
  const api = getDataviewApi(host.app);
  if (api === null) {
    await reportAdapterFeedback(
      host,
      "Dataview plugin not found. Install or enable Dataview to use this hint command.",
      "attention"
    );
    return;
  }

  const activeFile = host.app.workspace.getActiveFile();
  if (activeFile === null) {
    await reportAdapterFeedback(host, "Open a file first to inspect Dataview metadata.", "attention");
    return;
  }

  const page = api.page(activeFile.path, activeFile.path);
  if (page === undefined) {
    await reportAdapterFeedback(
      host,
      `Dataview has no cached page metadata for ${activeFile.basename} yet.`,
      "reviewing"
    );
    return;
  }

  const fileInfo = isRecord(page.file) ? page.file : null;
  const tagCount = countCollection(fileInfo?.tags ?? fileInfo?.etags) ?? 0;
  const taskCount = countCollection(fileInfo?.tasks) ?? 0;
  const aliasCount = countCollection(fileInfo?.aliases) ?? 0;

  await reportAdapterFeedback(
    host,
    `${activeFile.basename}: Dataview sees ${taskCount} task(s), ${tagCount} tag(s), and ${aliasCount} alias(es).`,
    "reviewing"
  );
}
