import fs from "node:fs";
import path from "node:path";

export type Logger = {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

function serialize(level: string, message: string, data?: Record<string, unknown>): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    data
  });
}

export function createLogger(logsDir: string): Logger {
  const logFile = path.join(logsDir, "oracle-server.log");
  fs.mkdirSync(logsDir, { recursive: true });

  function write(level: string, message: string, data?: Record<string, unknown>): void {
    const line = serialize(level, message, data);
    fs.appendFileSync(logFile, `${line}\n`, "utf8");
    console.log(line);
  }

  return {
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data)
  };
}
