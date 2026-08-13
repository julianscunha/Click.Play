export interface LogFields {
  jobId?: string;
  projectId?: string;
  stage?: string;
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

const SENSITIVE_KEYS = ["apikey", "api_key", "token", "secret", "password"];

function redact(fields: LogFields = {}): LogFields {
  const redacted: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    redacted[key] = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))
      ? "[redacted]"
      : value;
  }
  return redacted;
}

export function createConsoleLogger(): Logger {
  return {
    info: (message, fields) => console.log(JSON.stringify({ level: "info", message, ...redact(fields) })),
    warn: (message, fields) => console.warn(JSON.stringify({ level: "warn", message, ...redact(fields) })),
    error: (message, fields) => console.error(JSON.stringify({ level: "error", message, ...redact(fields) })),
  };
}
