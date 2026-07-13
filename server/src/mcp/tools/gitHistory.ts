import { gitRecentCommits, gitStatusSummary, hasGitRepository, latestGitCommit } from "../../infra/gitIntegration";
import type { ToolContext, ToolResult } from "./types";

export function buildGitHistoryTool(rootDir: string) {
  return async (ctx: ToolContext): Promise<ToolResult> => {
    const limitRaw = Number(ctx.payload.limit ?? 10);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 10;
    const pathValue = String(ctx.payload.path ?? "").trim();
    const filePath = pathValue.length > 0 ? pathValue : undefined;

    const available = hasGitRepository(rootDir);
    if (!available) {
      return {
        ok: true,
        tool: "git_history",
        data: {
          available: false,
          status: null,
          latestCommit: null,
          commits: []
        }
      };
    }

    return {
      ok: true,
      tool: "git_history",
      data: {
        available: true,
        status: gitStatusSummary(rootDir),
        latestCommit: latestGitCommit(rootDir),
        filterPath: filePath ?? null,
        commits: gitRecentCommits(rootDir, limit, filePath)
      }
    };
  };
}
