import type { ToolRegistry } from "../mcp/tools";

export type McpServer = {
  listTools: () => string[];
  invokeTool: (toolName: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export function createMcpServer(registry: ToolRegistry): McpServer {
  return {
    listTools: () => registry.names(),
    invokeTool: async (toolName, payload) => registry.run(toolName, payload)
  };
}
