import { reportAdapterFeedback, clipText, isRecord, type AdapterHost } from "./shared";

type OmnisearchResult = {
  basename: string | undefined;
  path: string | undefined;
  score: number | undefined;
};

type OmnisearchApi = {
  search(query: string): Promise<OmnisearchResult[]>;
};

function getOmnisearchApi(): OmnisearchApi | null {
  const candidate = (globalThis as typeof globalThis & { omnisearch?: unknown }).omnisearch;
  if (!isRecord(candidate)) {
    return null;
  }

  const search = candidate.search;
  if (typeof search !== "function") {
    return null;
  }

  return {
    search: async (query) => {
      const results = await (search as (query: string) => Promise<unknown>)(query);
      if (!Array.isArray(results)) {
        return [];
      }

      return results.filter(isRecord).map((result) => ({
        basename: typeof result.basename === "string" ? result.basename : undefined,
        path: typeof result.path === "string" ? result.path : undefined,
        score: typeof result.score === "number" ? result.score : undefined
      }));
    }
  };
}

export async function searchOmnisearchSelectionOrTitle(
  host: AdapterHost,
  fallbackQuery: string | null
): Promise<void> {
  const api = getOmnisearchApi();
  if (api === null) {
    await reportAdapterFeedback(
      host,
      "Omnisearch API not found. Install or enable Omnisearch to use this search hint command.",
      "attention"
    );
    return;
  }

  const activeFile = host.app.workspace.getActiveFile();
  const query = clipText(fallbackQuery ?? activeFile?.basename ?? "", 96);
  if (query.length === 0) {
    await reportAdapterFeedback(
      host,
      "Select some text or open a file first so Omnisearch has a query.",
      "attention"
    );
    return;
  }

  const results = await api.search(query);
  const topResult = results[0];
  if (topResult === undefined) {
    await reportAdapterFeedback(host, `Omnisearch found no hits for “${query}”.`, "reviewing");
    return;
  }

  const topLabel = clipText(topResult.basename ?? topResult.path ?? "top result", 72);
  await reportAdapterFeedback(
    host,
    `Omnisearch found ${results.length} hit(s) for “${query}”. Top result: ${topLabel}.`,
    "success"
  );
}
