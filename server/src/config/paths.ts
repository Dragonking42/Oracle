import path from "node:path";

export type OraclePaths = {
  rootDir: string;
  vaultDir: string;
  logsDir: string;
  configDir: string;
  embeddingsDir: string;
  dashboardDir: string;
};

export function detectOraclePaths(): OraclePaths {
  const rootDir = path.resolve(__dirname, "../../..");

  return {
    rootDir,
    vaultDir: path.join(rootDir, "vault"),
    logsDir: path.join(rootDir, "logs"),
    configDir: path.join(rootDir, "config"),
    embeddingsDir: path.join(rootDir, "embeddings"),
    dashboardDir: path.join(rootDir, "dashboard")
  };
}
