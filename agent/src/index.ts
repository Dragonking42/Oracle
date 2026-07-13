import { loadAgentConfig } from "./config";
import { runChatLoop, runSingleTurn } from "./chatLoop";
import { createMemoryStore } from "./memoryStore";
import { createMcpClient } from "./mcpClient";
import { createModelLoader } from "./modelLoader";
import { loadProjectContext } from "./projectContext";

async function main(): Promise<void> {
	const config = loadAgentConfig();
	const mcpClient = createMcpClient(config.mcpBaseUrl);
	const modelLoader = createModelLoader(config.ollamaBaseUrl, config.model);
	const projectContext = loadProjectContext(config.rootDir);
	const memoryStore = createMemoryStore(config.vaultDir);

	const [mcpHealthy, ollamaHealthy] = await Promise.all([
		mcpClient.healthCheck(),
		modelLoader.healthCheck()
	]);

	let availableTools: string[] = [];
	if (mcpHealthy) {
		try {
			availableTools = await mcpClient.listTools();
		} catch {
			availableTools = [];
		}
	}

	if (!mcpHealthy) {
		console.warn("warning: MCP server is unreachable. Start server before advanced agent actions.");
	}

	if (!ollamaHealthy) {
		console.warn("warning: Ollama is unreachable. Start Ollama before agent chat.");
	}

	const singlePrompt = process.env.ORACLE_AGENT_PROMPT;
	if (singlePrompt) {
		const result = await runSingleTurn(
			{ config, mcpClient, modelLoader, projectContext, memoryStore, availableTools },
			singlePrompt
		);
		console.log(result);
		return;
	}

	await runChatLoop({ config, mcpClient, modelLoader, projectContext, memoryStore, availableTools });
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`agent_fatal: ${message}`);
	process.exitCode = 1;
});
