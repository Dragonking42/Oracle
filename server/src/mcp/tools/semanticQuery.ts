import type { Curator } from "../../core/curator";
import type { ToolContext, ToolResult } from "./types";

export function buildSemanticQueryTool(curator: Curator) {
  return async (ctx: ToolContext): Promise<ToolResult> => {
    if (!curator.isEmbeddingsEnabled()) {
      return {
        ok: false,
        tool: "semantic_query",
        error: "semantic query is disabled"
      };
    }

    const query = String(ctx.payload.query ?? "").trim();
    const limit = Number(ctx.payload.limit ?? 5);

    if (!query) {
      return {
        ok: false,
        tool: "semantic_query",
        error: "query is required"
      };
    }

    const data = await curator.semanticQuery(query, Number.isFinite(limit) ? limit : 5);

    return {
      ok: true,
      tool: "semantic_query",
      data
    };
  };
}
