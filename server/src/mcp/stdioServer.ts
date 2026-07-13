import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Curator } from "../core/curator";
import { VaultManager } from "../core/vaultManager";
import { JsonFileVectorStore } from "../core/vectorStore";
import { detectOraclePaths } from "../config/paths";
import { hasGitRepository, latestGitCommit } from "../infra/gitIntegration";
import { ToolRegistry } from "./tools";

type OracleMode = "hybrid" | "pure_markdown";

type OracleConfig = {
  mode?: OracleMode;
  agent?: {
    persona?: string;
    model?: string;
  };
  features?: {
    enableEmbeddings?: boolean;
    backgroundReindexMinutes?: number;
  };
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

const paths = detectOraclePaths();
const logger = createLogger();
const config = readOracleConfig(paths.configDir);
const oracleVersion = readOracleVersion(paths.rootDir);
const mode = readOracleMode(config);
const vaultManager = new VaultManager(paths.vaultDir);
const vectorStore = new JsonFileVectorStore(path.join(paths.embeddingsDir, "vectors.json"));
const embeddingsEnabled = readEmbeddingsEnabled(config, mode);
const curator = new Curator(
  vaultManager,
  vectorStore,
  embeddingsEnabled,
  path.join(paths.logsDir, "curator-graph.json")
);
const tools = new ToolRegistry(vaultManager, curator, paths.rootDir);
const serverInfo = {
  name: "oracle-mcp",
  version: oracleVersion
};

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on("line", async (line) => {
  const raw = line.trim();
  if (!raw) {
    return;
  }

  let message: JsonRpcRequest | { jsonrpc?: string; method?: string; id?: string | number; params?: unknown };
  try {
    message = JSON.parse(raw) as typeof message;
  } catch (error) {
    writeError(null, -32700, "Parse error", error instanceof Error ? error.message : String(error));
    return;
  }

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    writeError(message?.id ?? null, -32600, "Invalid Request");
    return;
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "initialize") {
    const protocolVersion = extractProtocolVersion(message.params) ?? "2025-06-18";
    writeResponse(message.id ?? null, {
      protocolVersion,
      capabilities: {
        tools: {}
      },
      serverInfo
    });
    return;
  }

  if (message.method === "tools/list") {
    writeResponse(message.id ?? null, {
      tools: tools.definitions()
    });
    return;
  }

  if (message.method === "tools/call") {
    const params = isRecord(message.params) ? message.params : {};
    const toolName = String(params.name ?? "").trim();
    const argumentsValue = isRecord(params.arguments) ? params.arguments : {};

    if (!toolName) {
      writeError(message.id ?? null, -32602, "Invalid params", "name is required");
      return;
    }

    try {
      const result = await tools.run(toolName, argumentsValue);
      if (!result.ok) {
        writeResponse(message.id ?? null, {
          content: [{ type: "text", text: result.error ?? "tool failed" }],
          isError: true
        });
        return;
      }

      writeResponse(message.id ?? null, {
        content: [{ type: "text", text: stringifyResult(result.data) }]
      });
      return;
    } catch (error) {
      writeError(message.id ?? null, -32603, "Internal error", error instanceof Error ? error.message : String(error));
      return;
    }
  }

  writeError(message.id ?? null, -32601, "Method not found", `Unknown method: ${message.method}`);
});

process.on("SIGINT", () => {
  rl.close();
  process.exit(0);
});

logger.info("oracle_mcp_started", {
  rootDir: paths.rootDir,
  vaultDir: paths.vaultDir,
  embeddingsEnabled,
  mode,
  gitRepo: hasGitRepository(paths.rootDir),
  gitHead: latestGitCommit(paths.rootDir)
});

function writeResponse(id: string | number | null, result: unknown): void {
  const payload: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    result
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function writeError(id: string | number | null, code: number, message: string, data?: unknown): void {
  const payload: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data
    }
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function extractProtocolVersion(params: unknown): string | null {
  if (!isRecord(params)) {
    return null;
  }

  const protocolVersion = params.protocolVersion;
  return typeof protocolVersion === "string" && protocolVersion.trim() ? protocolVersion.trim() : null;
}

function stringifyResult(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  return JSON.stringify(data, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createLogger() {
  return {
    info(message: string, data?: unknown) {
      process.stderr.write(`${JSON.stringify({ level: "info", message, data, ts: new Date().toISOString() })}\n`);
    },
    error(message: string, data?: unknown) {
      process.stderr.write(`${JSON.stringify({ level: "error", message, data, ts: new Date().toISOString() })}\n`);
    }
  };
}

function readOracleConfig(configDir: string): OracleConfig {
  const configPath = path.join(configDir, "oracle.config.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as OracleConfig;
  } catch {
    return {};
  }
}

function readOracleMode(config: OracleConfig): OracleMode {
  const fromEnv = process.env.ORACLE_MODE?.trim().toLowerCase();
  if (fromEnv === "pure_markdown") {
    return "pure_markdown";
  }
  if (fromEnv === "hybrid") {
    return "hybrid";
  }

  return config.mode ?? "hybrid";
}

function readEmbeddingsEnabled(config: OracleConfig, mode: OracleMode): boolean {
  if (mode === "pure_markdown") {
    return false;
  }

  const fromEnv = process.env.ORACLE_ENABLE_EMBEDDINGS;
  if (fromEnv !== undefined) {
    return ["1", "true", "yes", "on"].includes(fromEnv.toLowerCase());
  }

  return config.features?.enableEmbeddings ?? true;
}

function readOracleVersion(rootDir: string): string {
  const versionPath = path.join(rootDir, "VERSION");
  if (!fs.existsSync(versionPath)) {
    return "0.0.0-dev";
  }

  try {
    const version = fs.readFileSync(versionPath, "utf8").trim();
    return version || "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}