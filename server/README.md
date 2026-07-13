# Oracle Server

The Oracle server is the core runtime for the Oracle workspace. It exposes the HTTP API, MCP tool bridge, curator workflows, vault access, and the chat endpoint used by the Oracle assistant experience.

## Responsibilities

- Serve `/health` and the local HTTP API
- Expose MCP tools for vault and curator operations
- Manage the markdown vault and chat-memory notes
- Run semantic search and graph operations through the curator
- Provide the dashboard backend and chat endpoint

## Key files

- `src/index.ts`: server bootstrap and configuration loading
- `src/infra/httpServer.ts`: HTTP routes and chat endpoint
- `src/infra/mcpServer.ts`: local MCP bridge
- `src/mcp/stdioServer.ts`: stdio MCP server for VS Code
- `src/core/vaultManager.ts`: vault read/write/search operations
- `src/core/curator.ts`: curator graph and reindexing logic

## Development

- Build: `npm run build`
- Dev run: `npm run dev`
- MCP stdio server: `npm run mcp`

## Notes

The server is designed for portable deployment. It should be started from the Oracle root so relative paths resolve correctly.