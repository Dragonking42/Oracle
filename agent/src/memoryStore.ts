import fs from "node:fs";
import path from "node:path";

export type MemoryStore = {
  saveTurn: (input: string, response: string) => Promise<string>;
  getRecentKeyPoints: (maxPoints?: number) => Promise<string[]>;
};

export function createMemoryStore(vaultDir: string): MemoryStore {
  const memoryDir = path.join(vaultDir, "chat-memory");
  fs.mkdirSync(memoryDir, { recursive: true });

  return {
    async saveTurn(input: string, response: string): Promise<string> {
      const stamp = new Date();
      const day = stamp.toISOString().slice(0, 10);
      const filePath = path.join(memoryDir, `${day}.md`);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `# Chat Memory ${day}\n\n`, "utf8");
      }

      const entry = [
        `## ${stamp.toISOString()}`,
        "",
        "### User",
        sanitize(input),
        "",
        "### Oracle",
        sanitize(response),
        "",
        "### Key Points",
        ...extractKeyPoints(input, response).map((point) => `- ${point}`),
        "",
        "---",
        ""
      ].join("\n");

      fs.appendFileSync(filePath, entry, "utf8");
      return toVaultRelative(memoryDir, filePath);
    },
    async getRecentKeyPoints(maxPoints = 8): Promise<string[]> {
      const points: string[] = [];

      const files = fs
        .readdirSync(memoryDir)
        .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
        .sort((a, b) => b.localeCompare(a));

      for (const fileName of files) {
        if (points.length >= maxPoints) {
          break;
        }

        const fullPath = path.join(memoryDir, fileName);
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split(/\r?\n/);

        for (let i = lines.length - 1; i >= 0; i -= 1) {
          const line = lines[i].trim();
          if (!line.startsWith("- ")) {
            continue;
          }

          const keyPoint = line.slice(2).trim();
          if (!keyPoint) {
            continue;
          }

          points.push(keyPoint);
          if (points.length >= maxPoints) {
            break;
          }
        }
      }

      return points;
    }
  };
}

function extractKeyPoints(input: string, response: string): string[] {
  const points: string[] = [];

  const normalizedInput = input.replace(/\s+/g, " ").trim();
  if (normalizedInput.length > 0) {
    points.push(`User intent: ${truncate(normalizedInput, 160)}`);
  }

  const lines = response
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (points.length >= 4) {
      break;
    }
    points.push(`Oracle response: ${truncate(line, 160)}`);
  }

  if (points.length === 0) {
    points.push("No key points extracted.");
  }

  return points;
}

function sanitize(value: string): string {
  const normalized = value.replace(/\r/g, "").trim();
  return normalized.length > 0 ? normalized : "(empty)";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function toVaultRelative(memoryDir: string, absoluteFilePath: string): string {
  const vaultDir = path.dirname(memoryDir);
  const relative = path.relative(vaultDir, absoluteFilePath);
  return relative.replace(/\\/g, "/");
}
