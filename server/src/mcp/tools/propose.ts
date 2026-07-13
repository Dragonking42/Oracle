import type { ToolContext, ToolResult } from "./types";

export async function proposeTool(ctx: ToolContext): Promise<ToolResult> {
  return {
    ok: true,
    tool: "propose",
    data: {
      proposal: ctx.payload,
      status: "captured"
    }
  };
}
