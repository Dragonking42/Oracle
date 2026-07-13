# Oracle Embeddings

This folder stores embedding and vector assets used by Oracle for semantic search and related curator workflows.

## Purpose

- Persist vector data for semantic search
- Support note similarity and curator workflows
- Provide a simple on-disk store for portable deployments

## Current state

- The server uses a pluggable `VectorStore` interface.
- The default development implementation is file-backed and lives in `server/src/core/vectorStore.ts`.

## Planned backends

- SQLite embedding store
- LanceDB
- Chroma

## Notes

Keep this folder portable. All paths should remain relative so Oracle can run from any install directory on the Dell machine.
