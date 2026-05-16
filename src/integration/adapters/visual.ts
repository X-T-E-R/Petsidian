import { TFile } from "obsidian";
import { reportAdapterFeedback, isRecord, type AdapterHost } from "./shared";

type CanvasNode = {
  id: string;
  type?: string;
};

type CanvasEdge = {
  fromNode: string;
  toNode: string;
};

type CanvasDataLike = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

function isCanvasNode(value: unknown): value is CanvasNode {
  return isRecord(value) && typeof value.id === "string";
}

function isCanvasEdge(value: unknown): value is CanvasEdge {
  return (
    isRecord(value) &&
    typeof value.fromNode === "string" &&
    typeof value.toNode === "string"
  );
}

function parseCanvasData(raw: string): CanvasDataLike | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return null;
  }

  const nodes = parsed.nodes.filter(isCanvasNode);
  const edges = parsed.edges.filter(isCanvasEdge);
  return {
    nodes,
    edges
  };
}

export async function analyzeCurrentCanvasFile(host: AdapterHost): Promise<void> {
  const activeFile = host.app.workspace.getActiveFile();
  if (!(activeFile instanceof TFile) || activeFile.extension !== "canvas") {
    await reportAdapterFeedback(
      host,
      "Open a .canvas file first to run the Canvas analyzer.",
      "attention"
    );
    return;
  }

  const rawCanvas = await host.app.vault.cachedRead(activeFile);
  const canvas = parseCanvasData(rawCanvas);
  if (canvas === null) {
    await reportAdapterFeedback(
      host,
      `Could not parse ${activeFile.basename}.canvas as Canvas JSON.`,
      "failure"
    );
    return;
  }

  const connectedNodeIds = new Set<string>();
  for (const edge of canvas.edges) {
    connectedNodeIds.add(edge.fromNode);
    connectedNodeIds.add(edge.toNode);
  }

  const orphanNodes = canvas.nodes.filter((node) => !connectedNodeIds.has(node.id));
  const fileNodes = canvas.nodes.filter((node) => node.type === "file").length;
  const textNodes = canvas.nodes.filter((node) => node.type === "text").length;
  const groupNodes = canvas.nodes.filter((node) => node.type === "group").length;

  await reportAdapterFeedback(
    host,
    orphanNodes.length > 0
      ? `${activeFile.basename}: ${orphanNodes.length} disconnected node(s) across ${canvas.nodes.length} node(s) and ${canvas.edges.length} edge(s).`
      : `${activeFile.basename}: ${canvas.nodes.length} node(s), ${canvas.edges.length} edge(s), ${fileNodes} file node(s), ${textNodes} text node(s), ${groupNodes} group node(s).`,
    orphanNodes.length > 0 ? "attention" : "success"
  );
}
