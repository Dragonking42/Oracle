import fs from "node:fs";
import path from "node:path";
import { Curator } from "./core/curator";
import { VaultManager } from "./core/vaultManager";
import { JsonFileVectorStore } from "./core/vectorStore";
import { detectOraclePaths } from "./config/paths";
import { hasGitRepository, latestGitCommit } from "./infra/gitIntegration";
import { startHttpServer } from "./infra/httpServer";
import { createLogger } from "./infra/logging";
import { createMcpServer } from "./infra/mcpServer";
import { ToolRegistry } from "./mcp/tools";

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

const paths = detectOraclePaths();
const logger = createLogger(paths.logsDir);
const config = readOracleConfig(paths.configDir);
const oracleVersion = readOracleVersion(paths.rootDir);
const mode = readOracleMode(config);
const vaultManager = new VaultManager(paths.vaultDir);
const vectorStore = new JsonFileVectorStore(`${paths.embeddingsDir}/vectors.json`);
const embeddingsEnabled = readEmbeddingsEnabled(config, mode);
const curator = new Curator(
  vaultManager,
  vectorStore,
  embeddingsEnabled,
  `${paths.logsDir}/curator-graph.json`
);
const tools = new ToolRegistry(vaultManager, curator, paths.rootDir);
const mcpServer = createMcpServer(tools);
const backgroundReindexMinutes = readBackgroundReindexMinutes(config);
const oraclePersona =
  config.agent?.persona ??
  "You are Barbara Gordon, codename Oracle. You are calm, precise, strategic, and supportive.";
const oracleModel = process.env.ORACLE_AGENT_MODEL ?? config.agent?.model ?? "qwen2:latest";
const ollamaBaseUrl = process.env.ORACLE_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const backgroundStatus = {
  enabled: backgroundReindexMinutes > 0,
  intervalMs: Math.max(0, Math.floor(backgroundReindexMinutes * 60_000)),
  running: false,
  lastAttemptAt: null as string | null,
  lastSuccessAt: null as string | null,
  lastError: null as string | null
};

if (backgroundStatus.enabled && backgroundStatus.intervalMs > 0) {
  setInterval(async () => {
    if (backgroundStatus.running) {
      return;
    }

    backgroundStatus.running = true;
    backgroundStatus.lastAttemptAt = new Date().toISOString();

    try {
      await curator.reindex();
      backgroundStatus.lastSuccessAt = new Date().toISOString();
      backgroundStatus.lastError = null;
    } catch (error) {
      backgroundStatus.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      backgroundStatus.running = false;
    }
  }, backgroundStatus.intervalMs);
}

const port = Number(process.env.ORACLE_SERVER_PORT ?? 7070);
startHttpServer({
  logger,
  mcpServer,
  vaultManager,
  curator,
  vaultDir: paths.vaultDir,
  dashboardDir: paths.dashboardDir,
  backgroundStatus,
  oracleChat: {
    persona: oraclePersona,
    model: oracleModel,
    ollamaBaseUrl
  },
  appInfo: {
    name: "Oracle",
    version: oracleVersion
  },
  runtimeProfile: {
    deviceName: "DELL",
    processor: "Intel(R) Core(TM) i5-7300HQ CPU @ 2.50GHz",
    installedRam: "32.0 GB (31.9 GB usable)",
    deviceId: "7368453C-1CF7-4211-995C-7CDDD2EE597C",
    productId: "00325-96111-29587-AAOEM",
    systemType: "64-bit operating system, x64-based processor",
    touch: "Touch support with 10 touch points"
  },
  port
});

logger.info("oracle_boot", {
  rootDir: paths.rootDir,
  vaultDir: paths.vaultDir,
  embeddingsDir: paths.embeddingsDir,
  mode,
  embeddingsEnabled,
  backgroundReindexMinutes,
  gitRepo: hasGitRepository(paths.rootDir),
  gitHead: latestGitCommit(paths.rootDir)
});

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

function readBackgroundReindexMinutes(config: OracleConfig): number {
  const fromEnv = process.env.ORACLE_BACKGROUND_REINDEX_MINUTES;
  if (fromEnv !== undefined) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return Math.max(0, config.features?.backgroundReindexMinutes ?? 0);
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
