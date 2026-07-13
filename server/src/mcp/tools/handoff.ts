import type { ToolContext, ToolResult } from "./types";

export async function handoffTool(ctx: ToolContext): Promise<ToolResult> {
  return {
    ok: true,
    tool: "handoff",
    data: {
      to: String(ctx.payload.to ?? "unassigned"),
      summary: String(ctx.payload.summary ?? ""),
      accepted: true
    }
  };
}
