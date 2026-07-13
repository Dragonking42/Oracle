# Oracle Dashboard

The Oracle dashboard is the browser-facing control surface for the workspace. It is designed to show vault content, curator state, graph relationships, and operational logs in one place.

## What it covers

- Vault browsing and note detail views
- Curator graph inspection and relationships
- Embedding and semantic search visibility
- Operational logs and status panels

## Run it

- Start the server first so the dashboard can call the local HTTP API.
- Open the UI at `http://localhost:7070/ui`.

## Files

- `index.html`: dashboard shell
- `app.js`: client-side behavior
- `styles.css`: dashboard styling

## Notes

This dashboard is intentionally lightweight. It is meant to present Oracle state, not replace the server or agent runtimes.
