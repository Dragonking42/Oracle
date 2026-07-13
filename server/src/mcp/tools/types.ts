export type ToolContext = {
  payload: Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolResult = {
  ok: boolean;
  tool: string;
  data?: unknown;
  error?: string;
};

export type ToolHandler = (ctx: ToolContext) => Promise<ToolResult>;
