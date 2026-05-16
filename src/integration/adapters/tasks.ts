import { App } from "obsidian";
import { reportAdapterFeedback, getRegisteredPlugin, isRecord, type AdapterHost } from "./shared";

type TasksApiV1 = {
  createTaskLineModal(): Promise<string>;
};

function getTasksApi(app: App): TasksApiV1 | null {
  const plugin = getRegisteredPlugin(app, "obsidian-tasks-plugin");
  if (!isRecord(plugin)) {
    return null;
  }

  const api = plugin.apiV1;
  if (!isRecord(api)) {
    return null;
  }

  const createTaskLineModal = api.createTaskLineModal;
  if (typeof createTaskLineModal !== "function") {
    return null;
  }

  return {
    createTaskLineModal: () =>
      (createTaskLineModal as () => Promise<string>)()
  };
}

export async function openTasksCreateTaskModal(host: AdapterHost): Promise<void> {
  const api = getTasksApi(host.app);
  if (api === null) {
    await reportAdapterFeedback(
      host,
      "Tasks plugin not found. Install or enable obsidian-tasks-plugin to use this command.",
      "attention"
    );
    return;
  }

  const taskLine = (await api.createTaskLineModal()).trim();
  if (taskLine.length === 0) {
    await reportAdapterFeedback(
      host,
      "Tasks modal closed without creating a task line.",
      "reviewing"
    );
    return;
  }

  await reportAdapterFeedback(host, `Tasks drafted: ${taskLine}`, "success");
}
