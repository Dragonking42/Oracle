import readline from "node:readline";
import type { AgentConfig } from "./config";
import type { MemoryStore } from "./memoryStore";
import type { McpClient } from "./mcpClient";
import type { ModelLoader } from "./modelLoader";

type ChatDeps = {
  config: AgentConfig;
  mcpClient: McpClient;
  modelLoader: ModelLoader;
  projectContext: string;
  memoryStore: MemoryStore;
  availableTools: string[];
};

type RecallItem = {
  title?: string;
  content?: string;
};

export async function runSingleTurn(deps: ChatDeps, userInput: string): Promise<string> {
  const context = await buildRecallContext(deps.mcpClient, userInput);
  const memoryContext = await buildMemoryContext(deps.memoryStore);
  const prompt = buildPrompt(
    deps.config.persona,
    deps.projectContext,
    context,
    memoryContext,
    deps.availableTools,
    userInput
  );
  const response = await deps.modelLoader.generate(prompt);

  if (deps.config.autoMemory) {
    try {
      await deps.memoryStore.saveTurn(userInput, response || "No response from model.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`memory-save-warning: ${message}`);
    }
  }

  return response || "No response from model.";
}

export async function runChatLoop(deps: ChatDeps): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Oracle agent online. Type 'exit' to quit.");
  console.log("Commands: /tools, /tool <name> <json-payload>");
  console.log(`Auto-memory: ${deps.config.autoMemory ? "enabled" : "disabled"}`);

  while (true) {
    const userInput = await ask(rl, "oracle> ");
    const trimmed = userInput.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed === "exit" || trimmed === "quit") {
      break;
    }

    if (trimmed === "/tools") {
      const tools = await deps.mcpClient.listTools();
      console.log(`tools: ${tools.join(", ")}`);
      continue;
    }

    if (trimmed.startsWith("/tool ")) {
      const result = await handleToolCommand(deps.mcpClient, trimmed.slice(6));
      console.log(result);
      continue;
    }

    try {
      const answer = await runSingleTurn(deps, trimmed);
      console.log(`oracle: ${answer}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`oracle-error: ${message}`);
    }
  }

  rl.close();
}

async function buildRecallContext(mcpClient: McpClient, query: string): Promise<string> {
  try {
    const result = await mcpClient.invokeTool("recall", { query });
    if (!result.ok || !Array.isArray(result.data)) {
      return "";
    }

    const items = (result.data as RecallItem[]).slice(0, 3);
    return items
      .map((item, index) => {
        const title = item.title ?? `Note ${index + 1}`;
        const body = (item.content ?? "").slice(0, 400);
        return `- ${title}: ${body}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}

function buildPrompt(
  persona: string,
  projectContext: string,
  context: string,
  memoryContext: string,
  availableTools: string[],
  userInput: string
): string {
  const projectBlock = projectContext ? `Project spec context:\n${projectContext}` : "Project spec context: none";
  const contextBlock = context ? `Vault context:\n${context}` : "Vault context: none";
  const memoryBlock = memoryContext ? `Recent chat memory:\n${memoryContext}` : "Recent chat memory: none";
  const toolBlock =
    availableTools.length > 0
      ? `Available MCP tools: ${availableTools.join(", ")}`
      : "Available MCP tools: unknown";

  return [
    persona,
    projectBlock,
    contextBlock,
    memoryBlock,
    toolBlock,
    "Instruction: This conversation is about the Oracle software project in the local workspace, not Oracle Corporation. Respond with concise tactical guidance and practical next steps. If tool use is needed, reference the best MCP tool by name.",
    `User request: ${userInput}`
  ].join("\n\n");
}

async function buildMemoryContext(memoryStore: MemoryStore): Promise<string> {
  try {
    const points = await memoryStore.getRecentKeyPoints(8);
    if (points.length === 0) {
      return "";
    }

    return points.map((point) => `- ${point}`).join("\n");
  } catch {
    return "";
  }
}

async function handleToolCommand(mcpClient: McpClient, commandBody: string): Promise<string> {
  const firstSpace = commandBody.indexOf(" ");
  const toolName = firstSpace === -1 ? commandBody.trim() : commandBody.slice(0, firstSpace).trim();
  const payloadText = firstSpace === -1 ? "{}" : commandBody.slice(firstSpace + 1).trim();

  const payload = JSON.parse(payloadText) as Record<string, unknown>;
  const result = await mcpClient.invokeTool(toolName, payload);
  return JSON.stringify(result, null, 2);
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}
