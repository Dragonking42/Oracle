import type { Curator } from "../../core/curator";
import type { VaultManager } from "../../core/vaultManager";
import { buildGitHistoryTool } from "./gitHistory";
import { handoffTool } from "./handoff";
import { proposeTool } from "./propose";
import { buildRecallTool } from "./recall";
import { buildReviewTool } from "./review";
import { buildSaveTool } from "./save";
import { buildSemanticQueryTool } from "./semanticQuery";
import { togglePrivateTool } from "./togglePrivate";
import type { ToolContext, ToolDefinition, ToolHandler, ToolResult } from "./types";
import { buildUpdateTool } from "./update";

export class ToolRegistry {
  private readonly handlers: Map<string, ToolHandler>;
  private readonly toolDefinitions: ToolDefinition[];

  constructor(vaultManager: VaultManager, curator: Curator, rootDir: string) {
    this.toolDefinitions = [
      {
        name: "recall",
        title: "Recall Notes",
        description: "Search vault notes for a query string.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Text to search for in vault notes." }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "propose",
        title: "Capture Proposal",
        description: "Capture a proposal payload for later review.",
        inputSchema: {
          type: "object",
          additionalProperties: true
        }
      },
      {
        name: "save",
        title: "Save Note",
        description: "Create a markdown note in the vault.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Vault-relative markdown path." },
            content: { type: "string", description: "Markdown content to save." }
          },
          required: ["path", "content"],
          additionalProperties: false
        }
      },
      {
        name: "update",
        title: "Update Note",
        description: "Update an existing markdown note in the vault.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Vault-relative markdown path." },
            content: { type: "string", description: "Replacement markdown content." }
          },
          required: ["path", "content"],
          additionalProperties: false
        }
      },
      {
        name: "review",
        title: "Reindex Curator",
        description: "Rebuild the curator graph and search index.",
        inputSchema: {
          type: "object",
          additionalProperties: false
        }
      },
      {
        name: "semantic_query",
        title: "Semantic Query",
        description: "Search the curator semantic index for matching content.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Semantic search query." },
            limit: { type: "number", description: "Maximum number of matches to return.", minimum: 1, maximum: 20 }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "git_history",
        title: "Git History",
        description: "Inspect repository status and recent commits.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of commits to return.", minimum: 1, maximum: 50 },
            path: { type: "string", description: "Optional path to scope history to." }
          },
          additionalProperties: false
        }
      },
      {
        name: "handoff",
        title: "Handoff",
        description: "Capture a handoff target and summary.",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Target person or role." },
            summary: { type: "string", description: "Brief handoff summary." }
          },
          additionalProperties: false
        }
      },
      {
        name: "toggle_private",
        title: "Toggle Private",
        description: "Flip the private state for a named target.",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "Target identifier to toggle." }
          },
          required: ["target"],
          additionalProperties: false
        }
      }
    ];

    this.handlers = new Map<string, ToolHandler>([
      ["recall", buildRecallTool(vaultManager)],
      ["propose", proposeTool],
      ["save", buildSaveTool(vaultManager)],
      ["update", buildUpdateTool(vaultManager)],
      ["review", buildReviewTool(curator)],
      ["semantic_query", buildSemanticQueryTool(curator)],
      ["git_history", buildGitHistoryTool(rootDir)],
      ["handoff", handoffTool],
      ["toggle_private", togglePrivateTool]
    ]);
  }

  names(): string[] {
    return [...this.handlers.keys()];
  }

  definitions(): ToolDefinition[] {
    return [...this.toolDefinitions];
  }

  async run(toolName: string, payload: Record<string, unknown>): Promise<ToolResult> {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return {
        ok: false,
        tool: toolName,
        error: "unknown tool"
      };
    }

    const ctx: ToolContext = { payload };
    return handler(ctx);
  }
}
