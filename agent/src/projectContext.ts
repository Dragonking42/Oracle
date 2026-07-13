import fs from "node:fs";
import path from "node:path";

export function loadProjectContext(rootDir: string): string {
  const specPath = path.join(rootDir, "Oracle.md");
  if (!fs.existsSync(specPath)) {
    return "";
  }

  const text = fs.readFileSync(specPath, "utf8");
  const compact = text.replace(/\r/g, "").trim();

  if (compact.length <= 2400) {
    return compact;
  }

  return `${compact.slice(0, 2400)}\n...`;
}
