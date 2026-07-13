import type { ToolContext, ToolResult } from "./types";
import type { Curator } from "../../core/curator";

export function buildReviewTool(curator: Curator) {
  return async (_ctx: ToolContext): Promise<ToolResult> => {
    const report = await curator.reindex();

    return {
      ok: true,
      tool: "review",
      data: report
    };
  };
}
