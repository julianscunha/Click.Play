#!/usr/bin/env node
// PostToolUse: depois de editar um .ts/.tsx em packages/*/src ou apps/*/src, roda
// `biome check --write` só naquele arquivo — aplica fixes seguros na hora (import
// order, process.env["X"] → process.env.X etc.) e devolve o que sobrar (não
// fixável automaticamente) como contexto. Não bloqueia — a edição já aconteceu,
// mesmo padrão do typecheck-on-edit.cjs.
const { execFileSync } = require("node:child_process");

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = payload?.tool_input?.file_path || "";
  if (!/[\\/](packages|apps)[\\/][^\\/]+[\\/]src[\\/].*\.tsx?$/.test(filePath)) process.exit(0);

  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  try {
    // shell: true — "pnpm" no Windows é um .cmd (shim), execFileSync sem shell falha com
    // ENOENT (achado real, testado) mesmo com o binário no PATH.
    execFileSync("pnpm", ["exec", "biome", "check", "--write", filePath], { cwd, stdio: "pipe", shell: true });
    process.exit(0);
  } catch (err) {
    // err.stdout/err.stderr só vêm populados quando o processo filho rodou e saiu com erro —
    // numa falha de spawn (ex.: "pnpm" não resolvido no PATH do runner de hooks) eles ficam
    // undefined; sem fallback pro err.message, a mensagem chegava em branco (achado real).
    const parts = [err.stdout, err.stderr].map((b) => (b ? b.toString() : "")).filter(Boolean);
    const out = parts.length > 0 ? parts.join("\n") : err.message || String(err);
    const lines = out.split("\n");
    const truncated = lines.length > 40 ? `${lines.slice(0, 40).join("\n")}\n... (+${lines.length - 40} linhas)` : out;
    console.error(`[lint] ${filePath} tem problema(s) que o biome não corrigiu sozinho:\n${truncated}`);
    process.exit(2);
  }
});
