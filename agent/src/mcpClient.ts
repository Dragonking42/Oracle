export type McpToolResult = {
  ok: boolean;
  tool: string;
  data?: unknown;
  error?: string;
};

export type McpClient = {
  healthCheck: () => Promise<boolean>;
  listTools: () => Promise<string[]>;
  invokeTool: (tool: string, payload: Record<string, unknown>) => Promise<McpToolResult>;
};

type ListToolsResponse = {
  tools?: string[];
};

export function createMcpClient(baseUrl: string): McpClient {
  return {
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    async listTools(): Promise<string[]> {
      const response = await fetch(`${baseUrl}/mcp/tools`);
      if (!response.ok) {
        throw new Error(`mcp_list_tools_failed: ${response.status}`);
      }

      const data = (await response.json()) as ListToolsResponse;
      return data.tools ?? [];
    },

    async invokeTool(tool: string, payload: Record<string, unknown>): Promise<McpToolResult> {
      const response = await fetch(`${baseUrl}/mcp/invoke`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ tool, payload })
      });

      if (!response.ok) {
        throw new Error(`mcp_invoke_failed: ${response.status}`);
      }

      return (await response.json()) as McpToolResult;
    }
  };
}
