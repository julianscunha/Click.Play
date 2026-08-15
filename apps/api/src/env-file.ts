import * as fs from "node:fs";

/**
 * Lê/escreve pares KEY=VALUE de um arquivo .env preservando linhas não
 * tocadas (comentários, ordem, chaves não gerenciadas por esta tela) —
 * settings gravam só os campos enviados, resto do arquivo fica intacto.
 */
export function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match) values[match[1]!] = match[2]!;
  }
  return values;
}

export function writeEnvFile(filePath: string, updates: Record<string, string>): void {
  for (const value of Object.values(updates)) {
    if (/[\r\n]/.test(value)) throw new Error("valor de env não pode conter quebra de linha");
  }

  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8").split(/\r?\n/) : [];
  const remaining = new Set(Object.keys(updates));

  const nextLines = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (match && remaining.has(match[1]!)) {
      const key = match[1]!;
      remaining.delete(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const key of remaining) nextLines.push(`${key}=${updates[key]}`);

  fs.writeFileSync(filePath, nextLines.join("\n"));
}
