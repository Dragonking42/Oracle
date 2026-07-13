import type { ToolContext, ToolResult } from "./types";
import type { VaultManager } from "../../core/vaultManager";

export function buildSaveTool(vaultManager: VaultManager) {
  return async (ctx: ToolContext): Promise<ToolResult> => {
    const relativePath = String(ctx.payload.path ?? "").trim();
    const content = String(ctx.payload.content ?? "");

    if (!relativePath.endsWith(".md")) {
      return {
        ok: false,
        tool: "save",
        error: "path must end with .md"
      };
    }

    const saved = vaultManager.saveNote(relativePath, content);

    return {
      ok: true,
      tool: "save",
      data: saved
    };
  };
}
