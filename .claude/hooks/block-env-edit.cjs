#!/usr/bin/env node
// PreToolUse: bloqueia edição direta de .env (segredos reais), permite .env.example.
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
  const isEnvFile = /(^|[\\/])\.env(\.[^.\\/]+)?$/.test(filePath);
  const isExample = /\.env\.example$/.test(filePath);

  if (isEnvFile && !isExample) {
    console.error(
      `Bloqueado: edição direta de "${filePath}". Arquivo .env guarda segredos reais — confirmar com o usuário antes de editar.`,
    );
    process.exit(2);
  }
  process.exit(0);
});
