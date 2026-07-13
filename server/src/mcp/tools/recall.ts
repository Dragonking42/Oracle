import type { ToolContext, ToolResult } from "./types";
import type { VaultManager } from "../../core/vaultManager";

export function buildRecallTool(vaultManager: VaultManager) {
  return async (ctx: ToolContext): Promise<ToolResult> => {
    const query = String(ctx.payload.query ?? "");
    const matches = vaultManager.searchNotes(query).slice(0, 20);

    return {
      ok: true,
      tool: "recall",
      data: matches
    };
  };
}
