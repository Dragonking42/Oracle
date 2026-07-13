import { execSync } from "node:child_process";

export type GitStatusSummary = {
  available: boolean;
  branch: string | null;
  changedFiles: string[];
};

export type GitCommit = {
  hash: string;
  author: string;
  date: string;
  subject: string;
};

export function hasGitRepository(rootDir: string): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: rootDir,
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}

export function latestGitCommit(rootDir: string): string | null {
  try {
    return execSync("git log -1 --pretty=%H", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe"
    }).trim();
  } catch {
    return null;
  }
}

export function gitStatusSummary(rootDir: string): GitStatusSummary {
  if (!hasGitRepository(rootDir)) {
    return {
      available: false,
      branch: null,
      changedFiles: []
    };
  }

  const output = execGit(rootDir, "git status --short --branch");
  const lines = output.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0] ?? "";
  const branch = header.startsWith("##") ? header.slice(2).trim().split("...")[0] : null;

  const changedFiles = lines.slice(1).map((line) => {
    const candidate = line.slice(3).trim();
    const renameParts = candidate.split(" -> ");
    return renameParts[renameParts.length - 1];
  });

  return {
    available: true,
    branch,
    changedFiles
  };
}

export function gitRecentCommits(rootDir: string, limit = 10, filePath?: string): GitCommit[] {
  if (!hasGitRepository(rootDir)) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const fileArg = filePath ? ` -- "${filePath.replace(/"/g, '\\"')}"` : "";
  const command =
    `git log -n ${safeLimit} --pretty=format:%H%x1f%an%x1f%ad%x1f%s --date=iso-strict` + fileArg;
  const output = execGit(rootDir, command);

  if (!output.trim()) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => {
      const [hash = "", author = "", date = "", subject = ""] = line.split("\u001f");
      return {
        hash,
        author,
        date,
        subject
      };
    })
    .filter((entry) => entry.hash.length > 0);
}

function execGit(rootDir: string, command: string): string {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe"
    }).trim();
  } catch {
    return "";
  }
}
