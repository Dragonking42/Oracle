import type { ToolContext, ToolResult } from "./types";
import type { VaultManager } from "../../core/vaultManager";

export function buildUpdateTool(vaultManager: VaultManager) {
  return async (ctx: ToolContext): Promise<ToolResult> => {
    const relativePath = String(ctx.payload.path ?? "").trim();
    const content = String(ctx.payload.content ?? "");

    const existing = vaultManager.getNote(relativePath);
    if (!existing) {
      return {
        ok: false,
        tool: "update",
        error: "note not found"
      };
    }

    const saved = vaultManager.saveNote(relativePath, content);

    return {
      ok: true,
      tool: "update",
      data: saved
    };
  };
}
