# Oracle Agent

The Oracle agent is the conversational runtime that loads the Barbara Gordon persona and coordinates with the Oracle server and local MCP tools.

## Responsibilities

- Load the local model configuration
- Maintain the Barbara Gordon persona
- Call Oracle MCP tools when needed
- Hold the conversational loop for local assistant usage

## Key files

- `src/index.ts`: agent bootstrap
- `src/config.ts`: agent configuration loading
- `src/modelLoader.ts`: local model initialization
- `src/mcpClient.ts`: MCP client wiring
- `src/chatLoop.ts`: conversation loop
- `src/projectContext.ts`: project context assembly

## Development

- Build: `npm run build`
- Dev run: `npm run dev`

## Notes

The agent is meant to stay aligned with the Oracle server, so its behavior should be documented and kept in sync with server-side capabilities.