#!/usr/bin/env node
// PostToolUse: após editar um .ts/.tsx em packages/*/src ou apps/*/src, roda
// typecheck só daquele pacote e devolve o erro como contexto (não bloqueia —
// a edição já aconteceu).
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
  const match = filePath.match(/[\\/](packages|apps)[\\/]([^\\/]+)[\\/]src[\\/].*\.tsx?$/);
  if (!match) process.exit(0);

  const pkgDir = `${match[1]}/${match[2]}`;
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  try {
    // --incremental reaproveita .tsbuildinfo entre chamadas — sem isso, tsc
    // recompila pacote inteiro do zero em CADA edit (custo tempo+tokens alto
    // em sessão longa).
    execFileSync(
      "pnpm",
      ["--filter", `./${pkgDir}`, "exec", "tsc", "--noEmit", "--incremental", "--tsBuildInfoFile", "hook.tsbuildinfo"],
      { cwd, stdio: "pipe" },
    );
    process.exit(0);
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n");
    const lines = out.split("\n");
    const truncated = lines.length > 40 ? `${lines.slice(0, 40).join("\n")}\n... (+${lines.length - 40} linhas)` : out;
    console.error(`[typecheck] ${pkgDir} falhou:\n${truncated}`);
    process.exit(2);
  }
});
