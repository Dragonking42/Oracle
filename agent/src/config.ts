import fs from "node:fs";
import path from "node:path";

export type AgentConfig = {
  rootDir: string;
  vaultDir: string;
  mcpBaseUrl: string;
  ollamaBaseUrl: string;
  model: string;
  persona: string;
  autoMemory: boolean;
};

type OracleConfigFile = {
  server?: { port?: number };
  agent?: { persona?: string; model?: string; autoMemory?: boolean };
};

const DEFAULT_PERSONA = [
  "You are Barbara Gordon, codename Oracle.",
  "You are calm, precise, strategic, and supportive.",
  "You coordinate intelligence for the Oracle project and prefer practical, incremental actions."
].join(" ");

export function loadAgentConfig(): AgentConfig {
  const rootDir = path.resolve(__dirname, "../..");
  const configPath = path.join(rootDir, "config", "oracle.config.json");

  let fileData: OracleConfigFile = {};
  if (fs.existsSync(configPath)) {
    fileData = JSON.parse(fs.readFileSync(configPath, "utf8")) as OracleConfigFile;
  }

  const serverPort = fileData.server?.port ?? 7070;

  return {
    rootDir,
    vaultDir: path.join(rootDir, "vault"),
    mcpBaseUrl: process.env.ORACLE_MCP_BASE_URL ?? `http://127.0.0.1:${serverPort}`,
    ollamaBaseUrl: process.env.ORACLE_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    model: process.env.ORACLE_AGENT_MODEL ?? fileData.agent?.model ?? "qwen2:latest",
    persona: fileData.agent?.persona ?? DEFAULT_PERSONA,
    autoMemory: readAutoMemoryFlag(fileData)
  };
}

function readAutoMemoryFlag(config: OracleConfigFile): boolean {
  const fromEnv = process.env.ORACLE_AGENT_AUTO_MEMORY;
  if (fromEnv !== undefined) {
    return ["1", "true", "yes", "on"].includes(fromEnv.toLowerCase());
  }

  return config.agent?.autoMemory ?? true;
}
