import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import type {
  CuratorGraphSnapshot,
  CuratorGraphNode,
  CuratorGraphEdge,
  DuplicateCandidate
} from "../core/curator";
import type { Curator } from "../core/curator";
import type { VaultManager } from "../core/vaultManager";
import type { Logger } from "./logging";
import type { McpServer } from "./mcpServer";

type HttpServerDeps = {
  logger: Logger;
  mcpServer: McpServer;
  vaultManager: VaultManager;
  curator: Curator;
  vaultDir: string;
  dashboardDir: string;
  oracleChat: {
    persona: string;
    model: string;
    ollamaBaseUrl: string;
  };
  appInfo: {
    name: string;
    version: string;
  };
  backgroundStatus: {
    enabled: boolean;
    intervalMs: number;
    running: boolean;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
  };
  runtimeProfile: {
    deviceName: string;
    processor: string;
    installedRam: string;
    deviceId: string;
    productId: string;
    systemType: string;
    touch: string;
  };
  port: number;
};

export function startHttpServer(deps: HttpServerDeps): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (method === "GET" && url.pathname === "/health") {
        return json(res, 200, { ok: true, service: "oracle-server" });
      }

      if (method === "GET" && url.pathname === "/mcp/tools") {
        return json(res, 200, { tools: deps.mcpServer.listTools() });
      }

      if (method === "POST" && url.pathname === "/mcp/invoke") {
        const body = await readJsonBody(req);
        const tool = String(body.tool ?? "");
        const payload = isRecord(body.payload) ? body.payload : {};

        const result = await deps.mcpServer.invokeTool(tool, payload);
        return json(res, 200, result);
      }

      if (method === "GET" && url.pathname === "/api/vault/notes") {
        const notes = deps.vaultManager.listNotes().map((note) => ({
          id: note.id,
          title: note.title,
          relativePath: note.relativePath,
          updatedAt: note.updatedAt
        }));
        return json(res, 200, { notes });
      }

      if (method === "GET" && url.pathname === "/api/curator/reindex") {
        const report = await deps.curator.reindex();
        return json(res, 200, { report });
      }

      if (method === "GET" && url.pathname === "/api/curator/graph") {
        const minDegree = Number(url.searchParams.get("minDegree") ?? "0");
        const minEdgeWeight = Number(url.searchParams.get("minEdgeWeight") ?? "1");
        const pathPrefix = (url.searchParams.get("pathPrefix") ?? "").trim();
        const orphansOnly = (url.searchParams.get("orphansOnly") ?? "false").toLowerCase() === "true";

        const filtered = filterGraphSnapshot(deps.curator.getGraphSnapshot(), {
          minDegree: Number.isFinite(minDegree) ? minDegree : 0,
          minEdgeWeight: Number.isFinite(minEdgeWeight) ? minEdgeWeight : 1,
          pathPrefix,
          orphansOnly
        });

        return json(res, 200, { graph: filtered });
      }

      if (method === "GET" && url.pathname === "/api/curator/graph/diff") {
        return json(res, 200, { diff: deps.curator.getGraphDiff() });
      }

      if (method === "GET" && url.pathname === "/api/git/history") {
        const limitRaw = Number(url.searchParams.get("limit") ?? "12");
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 12;
        const scopedPath = (url.searchParams.get("path") ?? "").trim();
        const payload = scopedPath ? { limit, path: scopedPath } : { limit };
        const result = await deps.mcpServer.invokeTool("git_history", payload);
        return json(res, 200, result);
      }

      if (method === "GET" && url.pathname === "/api/vault/note") {
        const relativePath = (url.searchParams.get("path") ?? "").trim();
        if (!relativePath) {
          return json(res, 400, { ok: false, error: "path is required" });
        }

        const note = deps.vaultManager.getNote(relativePath);
        if (!note) {
          return json(res, 404, { ok: false, error: "note not found" });
        }

        const backlinks = deps.curator.getBacklinks(relativePath);
        const related = deps.curator.getRelated(relativePath, 10).map((entry) => {
          const relatedNote = deps.vaultManager.getNote(entry.path);
          return {
            path: entry.path,
            score: entry.score,
            title: relatedNote?.title ?? entry.path
          };
        });

        return json(res, 200, {
          note,
          backlinks,
          related
        });
      }

      if (method === "GET" && url.pathname === "/api/vault/note/timeline") {
        const relativePath = (url.searchParams.get("path") ?? "").trim();
        if (!relativePath) {
          return json(res, 400, { ok: false, error: "path is required" });
        }

        const result = await deps.mcpServer.invokeTool("git_history", {
          limit: 20,
          path: relativePath
        });
        return json(res, 200, result);
      }

      if (method === "GET" && url.pathname === "/api/curator/background-status") {
        return json(res, 200, { background: deps.backgroundStatus });
      }

      if (method === "GET" && url.pathname === "/api/system/metrics") {
        const memory = process.memoryUsage();
        return json(res, 200, {
          app: deps.appInfo,
          profile: deps.runtimeProfile,
          process: {
            pid: process.pid,
            uptimeSeconds: Math.floor(process.uptime()),
            rssMB: Number((memory.rss / (1024 * 1024)).toFixed(2)),
            heapUsedMB: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
            heapTotalMB: Number((memory.heapTotal / (1024 * 1024)).toFixed(2))
          },
          lastReindex: deps.curator.getRuntimeStats(),
          background: deps.backgroundStatus
        });
      }

      if (method === "GET" && url.pathname === "/api/semantic/query") {
        const query = (url.searchParams.get("q") ?? "").trim();
        const limitRaw = Number(url.searchParams.get("limit") ?? "5");
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;

        if (!query) {
          return json(res, 400, { ok: false, error: "q is required" });
        }

        const matches = await deps.curator.semanticQuery(query, limit);
        return json(res, 200, { matches });
      }

      if (method === "POST" && url.pathname === "/api/oracle/chat") {
        const body = await readJsonBody(req);
        const message = String(body.message ?? "").trim();
        if (!message) {
          return json(res, 400, { ok: false, error: "message is required" });
        }

        if (isCapabilityQuestion(message)) {
          return json(res, 200, {
            ok: true,
            answer: buildCapabilitySummary(deps.mcpServer.listTools()),
            model: deps.oracleChat.model,
            persona: "Barbara Gordon (Oracle)"
          });
        }

        if (isMemoryRecallQuestion(message)) {
          return json(res, 200, {
            ok: true,
            answer: buildMemoryRecallAnswer(deps.vaultManager),
            model: deps.oracleChat.model,
            persona: "Barbara Gordon (Oracle)"
          });
        }

        const hintNotes = deps
          .vaultManager
          .searchNotes(message)
          .slice(0, 3)
          .map((note) => {
            const snippet = note.content.replace(/\s+/g, " ").slice(0, 220);
            return `- ${note.title} (${note.relativePath}): ${snippet}`;
          })
          .join("\n");

        const toolNames = deps.mcpServer.listTools().join(", ");
        const prompt = [
          deps.oracleChat.persona,
          "Rules: use only the tools and capabilities that are explicitly available in this server response. Do not invent tools, endpoints, or workflows. If a requested capability is unavailable, say so plainly and offer the closest available alternative.",
          "Response style: answer with specific, current capabilities from this server when asked what you can do. Prefer concise, concrete statements over generic offers like 'let me know what you need.'",
          "Instruction: You are communicating as Barbara Gordon (Oracle) for the Oracle project. Keep responses tactical, concise, and actionable.",
          recentChatMemorySnippet(deps.vaultManager),
          toolNames ? `Available MCP tools: ${toolNames}` : "Available MCP tools: unknown",
          hintNotes ? `Relevant vault notes:\n${hintNotes}` : "Relevant vault notes: none",
          `User request: ${message}`
        ].join("\n\n");

        const answer = await generateWithOllama(
          deps.oracleChat.ollamaBaseUrl,
          deps.oracleChat.model,
          prompt
        );

        try {
          appendOracleChatMemory(deps.vaultDir, message, answer, "dashboard");
        } catch (error) {
          deps.logger.error("oracle_chat_memory_write_failed", {
            error: error instanceof Error ? error.message : String(error)
          });
        }

        return json(res, 200, {
          ok: true,
          answer,
          model: deps.oracleChat.model,
          persona: "Barbara Gordon (Oracle)"
        });
      }

      if (method === "GET" && (url.pathname === "/ui" || url.pathname === "/ui/")) {
        return serveDashboardAsset(deps.dashboardDir, "index.html", res);
      }

      if (method === "GET" && url.pathname.startsWith("/ui/")) {
        const assetPath = url.pathname.slice(4);
        return serveDashboardAsset(deps.dashboardDir, assetPath, res);
      }

      json(res, 404, { ok: false, error: "not found" });
    } catch (error) {
      deps.logger.error("request_failure", {
        error: error instanceof Error ? error.message : String(error)
      });
      json(res, 500, { ok: false, error: "internal server error" });
    }
  });

  server.listen(deps.port, () => {
    deps.logger.info("http_server_started", { port: deps.port });
  });

  return server;
}

function filterGraphSnapshot(
  snapshot: CuratorGraphSnapshot,
  filters: {
    minDegree: number;
    minEdgeWeight: number;
    pathPrefix: string;
    orphansOnly: boolean;
  }
): CuratorGraphSnapshot {
  const prefix = filters.pathPrefix.replace(/\\/g, "/").toLowerCase();

  let nodes: CuratorGraphNode[] = [...snapshot.nodes];
  if (prefix) {
    nodes = nodes.filter((node) => node.id.toLowerCase().startsWith(prefix));
  }

  if (filters.orphansOnly) {
    nodes = nodes.filter((node) => node.incoming + node.outgoing === 0);
  }

  if (filters.minDegree > 0) {
    nodes = nodes.filter((node) => node.incoming + node.outgoing >= filters.minDegree);
  }

  const allowed = new Set(nodes.map((node) => node.id));
  const edges: CuratorGraphEdge[] = snapshot.edges.filter((edge) => {
    return (
      edge.weight >= Math.max(1, filters.minEdgeWeight) &&
      allowed.has(edge.from) &&
      allowed.has(edge.to)
    );
  });

  const duplicates: DuplicateCandidate[] = snapshot.duplicateSuggestions.filter((pair) => {
    return allowed.has(pair.a) && allowed.has(pair.b);
  });

  return {
    generatedAt: snapshot.generatedAt,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    duplicateSuggestions: duplicates
  };
}

function serveDashboardAsset(
  dashboardDir: string,
  requestedPath: string,
  res: http.ServerResponse
): void {
  const relative = requestedPath.replace(/^\/+/, "");
  const normalized = path.normalize(relative);
  const root = path.resolve(dashboardDir);
  const fullPath = path.resolve(root, normalized);

  if (!fullPath.startsWith(root) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    json(res, 404, { ok: false, error: "asset not found" });
    return;
  }

  const body = fs.readFileSync(fullPath);
  res.writeHead(200, {
    "content-type": contentTypeFor(fullPath),
    "content-length": body.byteLength
  });
  res.end(body);
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") {
    return "text/html; charset=utf-8";
  }
  if (ext === ".css") {
    return "text/css; charset=utf-8";
  }
  if (ext === ".js") {
    return "application/javascript; charset=utf-8";
  }
  if (ext === ".json") {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}

function json(res: http.ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCapabilityQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    /\bwhat can you do\b/.test(normalized) ||
    /\bwhat are your capabilities\b/.test(normalized) ||
    /\bwhat can you help with\b/.test(normalized) ||
    /\blist only real capabilities\b/.test(normalized) ||
    /\bavailable capabilities\b/.test(normalized)
  );
}

function isMemoryRecallQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    /\bwhat exact token did i ask you to remember\b/.test(normalized) ||
    /\bwhat did i ask you to remember\b/.test(normalized) ||
    /\bwhat token did i ask you to remember\b/.test(normalized) ||
    /\brecall.*token\b/.test(normalized) ||
    /\bremembered token\b/.test(normalized)
  );
}

function buildMemoryRecallAnswer(vaultManager: VaultManager): string {
  const note = latestChatMemoryNote(vaultManager);
  if (!note) {
    return "I do not have a recent chat-memory note to recall yet.";
  }

  const token = extractRememberedToken(note.content);
  if (token) {
    return `The exact token you asked me to remember was "${token}".`;
  }

  return "I found a recent chat-memory note, but no exact token could be extracted from it.";
}

function latestChatMemoryNote(vaultManager: VaultManager): { content: string } | null {
  const notes = vaultManager
    .listNotes()
    .filter((note) => note.relativePath.startsWith("chat-memory/"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return notes[0] ? { content: notes[0].content } : null;
}

function extractRememberedToken(content: string): string | null {
  const patterns = [
    /remember this exact token for later:\s*([A-Z0-9-]+)/gi,
    /please remember this exact token for later:\s*([A-Z0-9-]+)/gi,
    /recorded your input as\s*"([^"]+)"/gi,
    /remembered\s*as\s*"([^"]+)"/gi
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    let lastMatch: string | null = null;
    while ((match = pattern.exec(content)) !== null) {
      lastMatch = match[1].trim();
    }

    if (lastMatch) {
      return lastMatch;
    }
  }

  return null;
}

function recentChatMemorySnippet(vaultManager: VaultManager): string {
  const note = vaultManager
    .listNotes()
    .filter((entry) => entry.relativePath.startsWith("chat-memory/"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!note) {
    return "Recent chat-memory note: none";
  }

  const snippet = note.content.replace(/\s+/g, " ").slice(0, 1000);
  return `Recent chat-memory note (${note.relativePath}): ${snippet}`;
}

function buildCapabilitySummary(toolNames: string[]): string {
  const toolSummary = toolNames.length > 0 ? toolNames.join(", ") : "no MCP tools are currently available";

  return [
    "I can help with the Oracle server's real, current surface area:",
    `- Health and status: /health, /api/system/metrics`,
    `- Oracle chat: /api/oracle/chat`,
    `- MCP inspection and invocation: /mcp/tools, /mcp/invoke (${toolSummary})`,
    `- Vault browsing: /api/vault/notes, /api/vault/note, /api/vault/note/timeline`,
    `- Curator graph and diffs: /api/curator/graph, /api/curator/graph/diff`,
    `- Search and history: /api/semantic/query, /api/git/history`,
    `- Dashboard UI: /ui`,
    "If you want, I can also use the chat endpoint to help with a specific task right now."
  ].join("\n");
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk: Buffer | string) => {
      raw += chunk.toString();
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (isRecord(parsed)) {
          resolve(parsed);
          return;
        }

        reject(new Error("body must be a JSON object"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

async function generateWithOllama(baseUrl: string, model: string, prompt: string): Promise<string> {
  const target = new URL("/api/generate", baseUrl);
  const payload = JSON.stringify({
    model,
    prompt,
    stream: false
  });

  const responseBody = await httpPostJson(target, payload);
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseBody);
  } catch {
    throw new Error("invalid response from ollama");
  }

  if (!isRecord(parsed)) {
    throw new Error("invalid response shape from ollama");
  }

  const result = String(parsed.response ?? "").trim();
  if (!result) {
    return "No response from model.";
  }

  return result;
}

function httpPostJson(target: URL, payload: string): Promise<string> {
  const isTls = target.protocol === "https:";
  const client = isTls ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload)
        }
      },
      (res: http.IncomingMessage) => {
        let raw = "";
        res.on("data", (chunk: Buffer | string) => {
          raw += chunk.toString();
        });
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status >= 400) {
            reject(new Error(`ollama request failed (${status}): ${raw.slice(0, 220)}`));
            return;
          }

          resolve(raw);
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function appendOracleChatMemory(
  vaultDir: string,
  input: string,
  response: string,
  source: "dashboard" | "api"
): void {
  const memoryDir = path.join(vaultDir, "chat-memory");
  fs.mkdirSync(memoryDir, { recursive: true });

  const stamp = new Date();
  const day = stamp.toISOString().slice(0, 10);
  const filePath = path.join(memoryDir, `${day}.md`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# Chat Memory ${day}\n\n`, "utf8");
  }

  const entry = [
    `## ${stamp.toISOString()}`,
    "",
    "### Source",
    source,
    "",
    "### User",
    sanitizeMemoryValue(input),
    "",
    "### Oracle",
    sanitizeMemoryValue(response),
    "",
    "### Key Points",
    `- User intent: ${truncateMemoryPoint(input.replace(/\s+/g, " ").trim(), 160)}`,
    `- Oracle response: ${truncateMemoryPoint(response.replace(/\s+/g, " ").trim(), 160)}`,
    "",
    "---",
    ""
  ].join("\n");

  fs.appendFileSync(filePath, entry, "utf8");
}

function sanitizeMemoryValue(value: string): string {
  const normalized = value.replace(/\r/g, "").trim();
  return normalized.length > 0 ? normalized : "(empty)";
}

function truncateMemoryPoint(value: string, maxLen: number): string {
  if (!value) {
    return "(empty)";
  }
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen - 3)}...`;
}
