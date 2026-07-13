import fs from "node:fs";
import path from "node:path";
import type { VaultManager, VaultNote } from "./vaultManager";
import { embedText } from "./vectorStore";
import type { VectorStore } from "./vectorStore";

export type CuratorReport = {
  scanned: number;
  linksDetected: number;
  duplicateCandidates: DuplicateCandidate[];
  embeddingsUpserted: number;
  vectorBackend: string;
  graphNodes: number;
  graphEdges: number;
  durationMs: number;
  memoryUsedMB: number;
  completedAt: string;
};

export type SemanticMatch = {
  id: string;
  title: string;
  relativePath: string;
  snippet: string;
};

export type DuplicateCandidate = {
  a: string;
  b: string;
  confidence: number;
};

export type CuratorGraphNode = {
  id: string;
  title: string;
  incoming: number;
  outgoing: number;
  updatedAt: string;
};

export type CuratorGraphEdge = {
  from: string;
  to: string;
  kind: "wiki_link";
  weight: number;
};

export type CuratorGraphSnapshot = {
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: CuratorGraphNode[];
  edges: CuratorGraphEdge[];
  duplicateSuggestions: DuplicateCandidate[];
};

export type CuratorGraphDiff = {
  comparedAt: string;
  previousGeneratedAt: string | null;
  currentGeneratedAt: string;
  addedNodes: string[];
  removedNodes: string[];
  addedEdges: Array<{ from: string; to: string }>;
  removedEdges: Array<{ from: string; to: string }>;
  duplicateCountDelta: number;
};

export type CuratorRuntimeStats = {
  completedAt: string | null;
  durationMs: number;
  scanned: number;
  graphNodes: number;
  graphEdges: number;
  embeddingsUpserted: number;
  vectorBackend: string;
  memoryUsedMB: number;
};

export class Curator {
  private readonly vaultManager: VaultManager;
  private readonly vectorStore: VectorStore;
  private readonly embeddingsEnabled: boolean;
  private readonly graphStatePath: string;
  private readonly graphHistoryPath: string;
  private latestGraph: CuratorGraphSnapshot;
  private previousGraph: CuratorGraphSnapshot | null;
  private lastRun: CuratorRuntimeStats;

  constructor(
    vaultManager: VaultManager,
    vectorStore: VectorStore,
    embeddingsEnabled = true,
    graphStatePath?: string
  ) {
    this.vaultManager = vaultManager;
    this.vectorStore = vectorStore;
    this.embeddingsEnabled = embeddingsEnabled;
    this.graphStatePath = graphStatePath ?? path.join(process.cwd(), "logs", "curator-graph.json");
    this.graphHistoryPath = this.graphStatePath.replace(/\.json$/i, "-history.jsonl");
    this.latestGraph = this.loadGraphState();
    this.previousGraph = null;
    this.lastRun = {
      completedAt: null,
      durationMs: 0,
      scanned: 0,
      graphNodes: 0,
      graphEdges: 0,
      embeddingsUpserted: 0,
      vectorBackend: embeddingsEnabled ? "unknown" : "disabled",
      memoryUsedMB: 0
    };
  }

  isEmbeddingsEnabled(): boolean {
    return this.embeddingsEnabled;
  }

  async reindex(): Promise<CuratorReport> {
    const startedAt = Date.now();
    const notes = this.vaultManager.listNotes();
    const graph = buildGraph(notes);
    this.previousGraph = this.latestGraph;
    this.latestGraph = graph;
    this.saveGraphState(graph);
    this.appendGraphHistory(graph);

    const linksDetected = countWikiLinks(notes);
    const completedAt = new Date().toISOString();
    const memoryUsedMB = Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2));

    if (!this.embeddingsEnabled) {
      const report: CuratorReport = {
        scanned: notes.length,
        linksDetected,
        duplicateCandidates: graph.duplicateSuggestions,
        embeddingsUpserted: 0,
        vectorBackend: "disabled",
        graphNodes: graph.nodeCount,
        graphEdges: graph.edgeCount,
        durationMs: Date.now() - startedAt,
        memoryUsedMB,
        completedAt
      };

      this.lastRun = {
        completedAt,
        durationMs: report.durationMs,
        scanned: report.scanned,
        graphNodes: report.graphNodes,
        graphEdges: report.graphEdges,
        embeddingsUpserted: report.embeddingsUpserted,
        vectorBackend: report.vectorBackend,
        memoryUsedMB
      };

      return report;
    }

    const records = notes.map((note) => ({
      id: note.relativePath,
      text: `${note.title}\n${note.content}`,
      vector: embedText(`${note.title}\n${note.content}`),
      metadata: {
        title: note.title,
        relativePath: note.relativePath,
        updatedAt: note.updatedAt
      }
    }));
    await this.vectorStore.upsert(records);
    const health = await this.vectorStore.health();

    const report: CuratorReport = {
      scanned: notes.length,
      linksDetected,
      duplicateCandidates: graph.duplicateSuggestions,
      embeddingsUpserted: records.length,
      vectorBackend: health.backend,
      graphNodes: graph.nodeCount,
      graphEdges: graph.edgeCount,
      durationMs: Date.now() - startedAt,
      memoryUsedMB,
      completedAt
    };

    this.lastRun = {
      completedAt,
      durationMs: report.durationMs,
      scanned: report.scanned,
      graphNodes: report.graphNodes,
      graphEdges: report.graphEdges,
      embeddingsUpserted: report.embeddingsUpserted,
      vectorBackend: report.vectorBackend,
      memoryUsedMB
    };

    return report;
  }

  async semanticQuery(query: string, limit = 5): Promise<SemanticMatch[]> {
    if (!this.embeddingsEnabled) {
      return [];
    }

    const results = await this.vectorStore.query(embedText(query), limit);

    return results
      .map((row) => {
        const note = this.vaultManager.getNote(row.id);
        if (!note) {
          return null;
        }

        return {
          id: note.id,
          title: note.title,
          relativePath: note.relativePath,
          snippet: note.content.slice(0, 280)
        };
      })
      .filter((row): row is SemanticMatch => row !== null);
  }

  getGraphSnapshot(): CuratorGraphSnapshot {
    return this.latestGraph;
  }

  getGraphDiff(): CuratorGraphDiff {
    const previous = this.previousGraph;
    const current = this.latestGraph;

    const previousNodes = new Set((previous?.nodes ?? []).map((node) => node.id));
    const currentNodes = new Set(current.nodes.map((node) => node.id));

    const previousEdges = new Set((previous?.edges ?? []).map((edge) => `${edge.from}->${edge.to}`));
    const currentEdges = new Set(current.edges.map((edge) => `${edge.from}->${edge.to}`));

    return {
      comparedAt: new Date().toISOString(),
      previousGeneratedAt: previous?.generatedAt ?? null,
      currentGeneratedAt: current.generatedAt,
      addedNodes: [...currentNodes].filter((id) => !previousNodes.has(id)),
      removedNodes: [...previousNodes].filter((id) => !currentNodes.has(id)),
      addedEdges: [...currentEdges]
        .filter((key) => !previousEdges.has(key))
        .map(splitEdgeKey),
      removedEdges: [...previousEdges]
        .filter((key) => !currentEdges.has(key))
        .map(splitEdgeKey),
      duplicateCountDelta:
        current.duplicateSuggestions.length - (previous?.duplicateSuggestions.length ?? 0)
    };
  }

  getRuntimeStats(): CuratorRuntimeStats {
    return this.lastRun;
  }

  getBacklinks(notePath: string): string[] {
    return this.latestGraph.edges
      .filter((edge) => edge.to === notePath)
      .map((edge) => edge.from)
      .filter((value, index, arr) => arr.indexOf(value) === index);
  }

  getRelated(notePath: string, limit = 8): Array<{ path: string; score: number }> {
    const scores = new Map<string, number>();

    for (const edge of this.latestGraph.edges) {
      if (edge.from === notePath && edge.to !== notePath) {
        scores.set(edge.to, (scores.get(edge.to) ?? 0) + edge.weight * 1.1);
      }
      if (edge.to === notePath && edge.from !== notePath) {
        scores.set(edge.from, (scores.get(edge.from) ?? 0) + edge.weight);
      }
    }

    for (const dup of this.latestGraph.duplicateSuggestions) {
      if (dup.a === notePath && dup.b !== notePath) {
        scores.set(dup.b, (scores.get(dup.b) ?? 0) + dup.confidence * 2);
      }
      if (dup.b === notePath && dup.a !== notePath) {
        scores.set(dup.a, (scores.get(dup.a) ?? 0) + dup.confidence * 2);
      }
    }

    return [...scores.entries()]
      .map(([path, score]) => ({ path, score: Number(score.toFixed(2)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));
  }

  private saveGraphState(snapshot: CuratorGraphSnapshot): void {
    fs.mkdirSync(path.dirname(this.graphStatePath), { recursive: true });
    fs.writeFileSync(this.graphStatePath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  private appendGraphHistory(snapshot: CuratorGraphSnapshot): void {
    fs.mkdirSync(path.dirname(this.graphHistoryPath), { recursive: true });
    fs.appendFileSync(this.graphHistoryPath, `${JSON.stringify(snapshot)}\n`, "utf8");
  }

  private loadGraphState(): CuratorGraphSnapshot {
    if (!fs.existsSync(this.graphStatePath)) {
      return emptyGraphSnapshot();
    }

    try {
      return JSON.parse(fs.readFileSync(this.graphStatePath, "utf8")) as CuratorGraphSnapshot;
    } catch {
      return emptyGraphSnapshot();
    }
  }
}

function splitEdgeKey(key: string): { from: string; to: string } {
  const [from = "", to = ""] = key.split("->");
  return { from, to };
}

function countWikiLinks(notes: VaultNote[]): number {
  return notes.reduce((sum, note) => {
    const matches = note.content.match(/\[\[[^\]]+\]\]/g);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function buildGraph(notes: VaultNote[]): CuratorGraphSnapshot {
  const noteById = new Map<string, VaultNote>();
  const aliases = new Map<string, string>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const edgeWeights = new Map<string, number>();

  for (const note of notes) {
    noteById.set(note.relativePath, note);
    incoming.set(note.relativePath, 0);
    outgoing.set(note.relativePath, 0);

    const baseName = note.relativePath.split("/").pop() ?? note.relativePath;
    aliases.set(baseName.toLowerCase().replace(/\.md$/i, ""), note.relativePath);
    aliases.set(note.title.trim().toLowerCase(), note.relativePath);
  }

  for (const note of notes) {
    for (const rawTarget of extractWikiLinks(note.content)) {
      const normalized = rawTarget.trim().toLowerCase();
      if (!normalized) {
        continue;
      }

      const resolved = aliases.get(normalized) ?? aliases.get(normalized.replace(/\.md$/i, ""));
      if (!resolved || resolved === note.relativePath) {
        continue;
      }

      const key = `${note.relativePath}->${resolved}`;
      edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
      outgoing.set(note.relativePath, (outgoing.get(note.relativePath) ?? 0) + 1);
      incoming.set(resolved, (incoming.get(resolved) ?? 0) + 1);
    }
  }

  const edges: CuratorGraphEdge[] = [...edgeWeights.entries()].map(([key, weight]) => {
    const [from, to] = key.split("->");
    return {
      from,
      to,
      kind: "wiki_link",
      weight
    };
  });

  const nodes: CuratorGraphNode[] = notes.map((note) => ({
    id: note.relativePath,
    title: note.title,
    incoming: incoming.get(note.relativePath) ?? 0,
    outgoing: outgoing.get(note.relativePath) ?? 0,
    updatedAt: note.updatedAt
  }));

  const duplicateSuggestions = findDuplicateCandidates(notes);

  return {
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    duplicateSuggestions
  };
}

function findDuplicateCandidates(notes: VaultNote[]): DuplicateCandidate[] {
  const output: DuplicateCandidate[] = [];

  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const a = notes[i];
      const b = notes[j];
      const score = duplicateScore(a, b);

      if (score >= 0.58) {
        output.push({
          a: a.relativePath,
          b: b.relativePath,
          confidence: Number(score.toFixed(2))
        });
      }
    }
  }

  return output.sort((x, y) => y.confidence - x.confidence).slice(0, 30);
}

function duplicateScore(a: VaultNote, b: VaultNote): number {
  const title = jaccard(tokens(a.title), tokens(b.title));
  const bodyA = a.content.slice(0, 1200);
  const bodyB = b.content.slice(0, 1200);
  const body = jaccard(tokens(bodyA), tokens(bodyB));
  return title * 0.75 + body * 0.25;
}

function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[[^\]]+\]\]/g) ?? [];
  return matches.map((value) => {
    const inner = value.slice(2, -2);
    return inner.split("|")[0].trim();
  });
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersection += 1;
    }
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function emptyGraphSnapshot(): CuratorGraphSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    nodeCount: 0,
    edgeCount: 0,
    nodes: [],
    edges: [],
    duplicateSuggestions: []
  };
}
