import fs from "node:fs";
import path from "node:path";

export type EmbeddingRecord = {
  id: string;
  text: string;
  vector: number[];
  metadata?: Record<string, unknown>;
};

export interface VectorStore {
  upsert(records: EmbeddingRecord[]): Promise<void>;
  query(vector: number[], limit: number): Promise<EmbeddingRecord[]>;
  health(): Promise<{ ok: boolean; backend: string }>;
}

export function embedText(input: string, dimensions = 64): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const text = input.toLowerCase();

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const slot = code % dimensions;
    vector[slot] += 1;
  }

  return normalize(vector);
}

export class JsonFileVectorStore implements VectorStore {
  private readonly filePath: string;
  private readonly records = new Map<string, EmbeddingRecord>();

  constructor(filePath: string) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as EmbeddingRecord[];
      for (const record of parsed) {
        this.records.set(record.id, record);
      }
    }
  }

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, record);
    }

    const serialized = JSON.stringify([...this.records.values()], null, 2);
    fs.writeFileSync(this.filePath, serialized, "utf8");
  }

  async query(vector: number[], limit: number): Promise<EmbeddingRecord[]> {
    const ranked = [...this.records.values()]
      .map((record) => ({
        record,
        score: cosineSimilarity(vector, record.vector)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    return ranked.map((row) => row.record);
  }

  async health(): Promise<{ ok: boolean; backend: string }> {
    return { ok: true, backend: "json-file" };
  }
}

export class InMemoryVectorStore implements VectorStore {
  private readonly records = new Map<string, EmbeddingRecord>();

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async query(vector: number[], limit: number): Promise<EmbeddingRecord[]> {
    const ranked = [...this.records.values()]
      .map((record) => ({
        record,
        score: cosineSimilarity(vector, record.vector)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));

    return ranked.map((row) => row.record);
  }

  async health(): Promise<{ ok: boolean; backend: string }> {
    return { ok: true, backend: "in-memory" };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function normalize(vector: number[]): number[] {
  let magnitude = 0;
  for (const value of vector) {
    magnitude += value * value;
  }

  if (magnitude === 0) {
    return vector;
  }

  const scale = Math.sqrt(magnitude);
  return vector.map((value) => value / scale);
}
