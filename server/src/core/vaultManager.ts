import fs from "node:fs";
import path from "node:path";

export type VaultNote = {
  id: string;
  title: string;
  content: string;
  relativePath: string;
  updatedAt: string;
};

export class VaultManager {
  private readonly vaultDir: string;

  constructor(vaultDir: string) {
    this.vaultDir = vaultDir;
    fs.mkdirSync(this.vaultDir, { recursive: true });
  }

  listNotes(): VaultNote[] {
    const files = this.walk(this.vaultDir).filter((f) => f.endsWith(".md"));

    return files.map((absolutePath) => {
      const content = fs.readFileSync(absolutePath, "utf8");
      const stat = fs.statSync(absolutePath);
      const relativePath = path.relative(this.vaultDir, absolutePath).replace(/\\/g, "/");
      const title = extractTitle(relativePath, content);

      return {
        id: relativePath,
        title,
        content,
        relativePath,
        updatedAt: stat.mtime.toISOString()
      };
    });
  }

  getNote(relativePath: string): VaultNote | null {
    const full = this.resolveInsideVault(relativePath);
    if (!fs.existsSync(full)) {
      return null;
    }

    const content = fs.readFileSync(full, "utf8");
    const stat = fs.statSync(full);

    return {
      id: relativePath,
      title: extractTitle(relativePath, content),
      content,
      relativePath,
      updatedAt: stat.mtime.toISOString()
    };
  }

  saveNote(relativePath: string, content: string): VaultNote {
    const full = this.resolveInsideVault(relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");

    const saved = this.getNote(relativePath);
    if (!saved) {
      throw new Error("Failed to read note after save");
    }

    return saved;
  }

  searchNotes(query: string): VaultNote[] {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return this.listNotes().filter((note) => {
      return note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle);
    });
  }

  private resolveInsideVault(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const full = path.resolve(this.vaultDir, normalized);

    const vaultRoot = path.resolve(this.vaultDir);
    if (!full.startsWith(vaultRoot)) {
      throw new Error("Path escapes vault directory");
    }

    return full;
  }

  private walk(dir: string): string[] {
    const output: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        output.push(...this.walk(full));
      } else {
        output.push(full);
      }
    }
    return output;
  }
}

function extractTitle(relativePath: string, content: string): string {
  const firstHeading = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("#"));

  if (firstHeading) {
    return firstHeading.replace(/^#+\s*/, "").trim();
  }

  return relativePath.replace(/\.md$/i, "");
}
