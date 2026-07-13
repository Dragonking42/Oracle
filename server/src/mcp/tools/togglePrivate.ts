import type { ToolContext, ToolResult } from "./types";

const privacyState = new Map<string, boolean>();

export async function togglePrivateTool(ctx: ToolContext): Promise<ToolResult> {
  const target = String(ctx.payload.target ?? "").trim();
  if (!target) {
    return {
      ok: false,
      tool: "toggle_private",
      error: "target is required"
    };
  }

  const next = !privacyState.get(target);
  privacyState.set(target, next);

  return {
    ok: true,
    tool: "toggle_private",
    data: {
      target,
      private: next
    }
  };
}
