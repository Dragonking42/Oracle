# Oracle

Oracle is a portable MCP-based intelligence workspace built around a Barbara Gordon persona. It packages a server, agent, dashboard, vault, embeddings, and launch scripts that can run from any folder on the Dell laptop.

## Version

- Current version: 0.2.0
- Release label: Oracle

## Description

Oracle is intended to act as a local coordination hub for notes, semantic search, curator workflows, and chat-driven assistance.

## What ships with the repository

- `server/`: Oracle MCP server, chat endpoint, tool registry, and HTTP APIs
- `agent/`: Assistant-side runtime and model integration
- `dashboard/`: Browser UI for vault and curator views
- `vault/`: Markdown knowledge base and chat memory
- `embeddings/`: Optional vector store backing semantic search
- `config/`: Oracle configuration
- `scripts/`: Launch, preflight, install, and packaging scripts

## Build / package

- Package build script: `scripts/build-install-package.ps1`
- Default package label: `Oracle`
- Package version comes from the root `VERSION` file

## Install / run

- Run `scripts/launch.ps1` to start Oracle locally
- Use `scripts/preflight.ps1` to verify server, Ollama, and memory access before launch

## Notes

This repository is set up for portable deployment, so paths stay relative and the install location can be chosen per machine.