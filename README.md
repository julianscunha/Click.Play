# Click.Play

![status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![typescript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-green)

Web app de produção automatizada de vídeo: você entra com um tópico (e ajustes opcionais de tom, ritmo, estilo), o sistema pesquisa, escreve o roteiro, planeja a direção visual, gera narração + legendas + trilha, e renderiza um vídeo final — do formulário ao MP4, sem edição manual.

Não é instalável (não é PWA/app nativo) — roda como aplicação web comum (API + front-end).

## Para que serve

Fluxo ponta a ponta pra gerar vídeos curtos (estilo shorts/reels) a partir de um tópico:

1. **Research** — levanta fatos e contexto sobre o tópico.
2. **Creative Director + Critic** — planeja cenas (roteiro, estratégia visual, transições), com um loop de revisão automática até atingir nota mínima de qualidade.
3. **Estimativa de custo** — antes de gastar com geração de mídia, mostra o custo estimado (LLM + TTS + imagem/vídeo IA + música) pra aprovação.
4. **TTS** — narração com timestamps por palavra (base pra legendas sincronizadas).
5. **Produção visual** — resolve cada cena em imagem/vídeo (IA generativa ou banco de imagens/vídeos), conforme a estratégia definida.
6. **Música + legendas + render** — monta a timeline (Remotion) e renderiza o vídeo final.
7. **Quality Control determinístico** — depois do render, valida o arquivo de saída (existência, duração, resolução, cortes pretos, cobertura de narração, nota do critic, desvio de custo) e decide `PASS`/`WARNING`/`BLOCK` antes de marcar o job como concluído.

Acompanhamento do job é em tempo real (polling): fila → pesquisa → planejamento → revisão → aprovação de custo → geração → renderização → concluído.

## Stack

Monorepo pnpm, TypeScript de ponta a ponta:

| Pacote | Papel |
|---|---|
| `apps/web` | Front-end (React + Vite) — formulário, progresso do job, player do resultado |
| `apps/api` | API (Fastify) — orquestra o pipeline, expõe jobs/config/arquivos |
| `packages/domain` | Schemas (Zod) e regras de domínio, sem dependências externas |
| `packages/providers` | Providers (LLM, TTS, imagem, vídeo, música, banco de imagens), pipeline, persistência (SQLite), QC |
| `packages/video-engine` | Renderização (Remotion) |

Base técnica reaproveitada do [OpenReels](https://github.com/openreels/openreels) (MIT); UX/produto inspirado no [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) (só referência de fluxo, não código).

## Requisitos

- Node.js **≥ 22**
- [pnpm](https://pnpm.io/)
- `ffmpeg`/`ffprobe` **não precisam** estar instalados no sistema — o projeto usa `ffmpeg-static`/`ffprobe-static` (binários via npm)

## Instalação

```bash
git clone https://github.com/julianscunha/Click.Play.git
cd Click.Play
pnpm install
```

> **Windows:** se `pnpm install` travar com `[ERR_PNPM_IGNORED_BUILDS]` ao adicionar uma dependência nova com script nativo, adicione a entrada em `allowBuilds` no `pnpm-workspace.yaml` e rode `pnpm install` de novo (não use `pnpm approve-builds`, é interativo e quebra em ambiente non-tty).

### Configuração

Copie o template de variáveis de ambiente pra dentro de `apps/api/`:

```bash
cp .env.example apps/api/.env
```

Preencha em `apps/api/.env`:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `OPENROUTER_API_KEY` | Sim | Chave da [OpenRouter](https://openrouter.ai/) — usada pelo LLM (research, Creative Director, Critic) |
| `OPENROUTER_MODEL` | Sim | Modelo a usar (ex.: `openrouter/free` pros testes) |
| `TTS_PROVIDER` | Sim | `edge` funciona sem chave (Edge TTS, grátis) |
| `TTS_API_KEY` | Só se o provider exigir | — |
| `GOOGLE_API_KEY` / `FAL_API_KEY` | Não | Habilitam geração de imagem/vídeo por IA (Gemini/Fal). Sem elas, cenas caem pro banco de imagens/vídeos (Pexels/Pixabay) |
| `PEXELS_API_KEY` / `PIXABAY_API_KEY` | Não | Banco de imagens/vídeos de stock |
| `DATABASE_URL` | Não | Caminho do SQLite (default: `./data/clickplay.sqlite`) |
| `RUNS_DIR` | Não | Diretório de saída dos jobs (default: `./data/runs`) |
| `PORT` | Não | Porta da API (default: `8787`) |

Sem `GOOGLE_API_KEY`/`FAL_API_KEY`/chaves de stock, o pipeline ainda roda de ponta a ponta — só as cenas que pedem imagem/vídeo IA falham na resolução de elemento.

### Onde conseguir cada chave

- **OpenRouter** (`OPENROUTER_API_KEY`) — crie conta em [openrouter.ai](https://openrouter.ai/), vá em [Settings → API Keys](https://openrouter.ai/settings/keys) → **Create Key**. Modelo padrão do projeto é `openrouter/free` (roteador gratuito, sem custo); pra usar outro modelo, veja a lista em [openrouter.ai/models](https://openrouter.ai/models) e copie o `id` exato (ex.: `anthropic/claude-sonnet-4`) pra `OPENROUTER_MODEL`.
- **Google Gemini** (`GOOGLE_API_KEY`, opcional) — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**. Tem cota gratuita.
- **Fal.ai** (`FAL_API_KEY`, opcional) — crie conta em [fal.ai](https://fal.ai/), vá em [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) → **Add key**.
- **Pexels** (`PEXELS_API_KEY`, opcional) — [pexels.com/api](https://www.pexels.com/api/) → **Get Started**, cria a chave na hora, sem cartão.
- **Pixabay** (`PIXABAY_API_KEY`, opcional) — crie conta em [pixabay.com](https://pixabay.com/), a chave fica em [pixabay.com/api/docs](https://pixabay.com/api/docs/) (seção "Getting started", já logado).

Nenhum desses serviços pede cartão de crédito só pra gerar a chave (planos gratuitos cobrem os testes).

## Uso

### Local (Node/pnpm)

Suba API e front-end em dois terminais:

```bash
pnpm dev:api   # http://localhost:8787
pnpm dev:web   # front-end (Vite dev server)
```

### Docker

Alternativa sem instalar Node/pnpm no host:

```bash
cp .env.example apps/api/.env   # precisa existir antes do primeiro up (bind mount)
docker compose up --build
```

- API: http://localhost:8787
- Front-end: http://localhost:5173

`apps/api/.env` é montado direto do host — preencha as chaves nele ou pela tela **Configurações** do front-end (grava no mesmo arquivo, sem precisar rebuildar a imagem). Job/DB persistem em volume nomeado (`clickplay-data`). Imagem só `linux/amd64` por ora.

Acesse o front-end, preencha o formulário (tópico, direção livre, arquétipo, ritmo, estilo de legenda), acompanhe o progresso do job e, ao final, assista/baixe o vídeo gerado.

> **Segurança:** a API não tem autenticação em nenhuma rota (inclusive `/settings`, que grava credenciais em `apps/api/.env`) — é feita pra rodar em `localhost`, uso pessoal, não pra expor na rede/internet sem colocar autenticação na frente (proxy, VPN, etc.).

### Comandos

```bash
pnpm build              # build de todos os pacotes
pnpm test               # testes — workspace inteiro
pnpm typecheck          # typecheck — workspace inteiro
pnpm lint               # lint — workspace inteiro

pnpm --filter @clickplay/<pkg> test        # por pacote
pnpm --filter @clickplay/<pkg> typecheck   # por pacote
```

## Estrutura do plano

O desenvolvimento segue um plano vivo em [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — arquitetura, fases concluídas/planejadas e roadmap de produto (evolução Studio → SaaS).

## Licença

[MIT](LICENSE)
