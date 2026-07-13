# Oracle Embeddings

This folder stores embedding/vector assets for Oracle.

Current status:
- `server/src/core/vectorStore.ts` provides a pluggable `VectorStore` interface.
- Default implementation is `InMemoryVectorStore` for development.

Planned backends:
- SQLite embedding store
- LanceDB
- Chroma
