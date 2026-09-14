import { useEffect, useState } from "react";
import { type Credits, listSchedules, listTemplates } from "../api.js";

export interface HomeViewProps {
  credits: Credits | null;
  onStart(): void;
}

const PIPELINE_STAGES: { icon: React.ReactNode; title: string; description: string }[] = [
  {
    title: "Roteiro por IA",
    description: "Um Creative Director artificial pesquisa o tema e escreve o roteiro cena a cena.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    title: "Imagem e vídeo",
    description: "Cada cena ganha visual gerado por IA ou banco de mídia, com movimento de câmera.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M4 17l5-5 4 4 3-3 4 4" />
      </svg>
    ),
  },
  {
    title: "Narração natural",
    description: "Voz sintetizada com timing real de fala, pronta pra sincronizar com a legenda.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
      </svg>
    ),
  },
  {
    title: "Legenda e música",
    description: "Legenda estilizada queimada no vídeo, trilha sonora escolhida pelo clima da cena.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <circle cx="7" cy="18" r="2.5" />
        <circle cx="17" cy="16" r="2.5" />
        <path d="M9.5 18V5.5L19.5 4v11.5" />
      </svg>
    ),
  },
  {
    title: "Publicação",
    description: "Controle de qualidade automático e publicação direta no YouTube, sem sair do app.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3v12M12 3l4 4M12 3 8 7" />
        <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </svg>
    ),
  },
];

function stagger(index: number): React.CSSProperties {
  return { "--stagger-delay": `${index * 70}ms` } as React.CSSProperties;
}

export function HomeView({ credits, onStart }: HomeViewProps) {
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);

  useEffect(() => {
    listTemplates()
      .then((t) => setTemplateCount(t.length))
      .catch(() => {
        // Chip informativo — falha pontual não deve travar a tela inicial.
      });
    listSchedules()
      .then((s) => setScheduleCount(s.filter((x) => x.enabled).length))
      .catch(() => {
        // Idem.
      });
  }, []);

  return (
    <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-6 pb-16 text-center">
      {/* Glow ambiente — orange-500 borrado bem baixo em opacidade, atrás do hero só (não atrapalha leitura). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[110px]"
      />

      <div className="relative flex flex-col items-center gap-5">
        <span
          style={stagger(0)}
          className="animate-rise-fade rounded-full border border-border-default bg-surface-1 px-3 py-1 text-xs font-medium tracking-wide text-fg-secondary uppercase"
        >
          Produção de vídeo automatizada
        </span>

        <h1
          style={stagger(1)}
          className="animate-rise-fade text-5xl font-extrabold tracking-tight text-balance sm:text-6xl"
        >
          Do tema ao vídeo pronto,
          <br />
          <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">sem tocar em timeline</span>
        </h1>

        <p style={stagger(2)} className="animate-rise-fade max-w-xl text-balance text-base text-fg-secondary sm:text-lg">
          Digite um tema. A IA pesquisa, escreve o roteiro, gera o visual, narra, legenda e monta o vídeo final —
          você só aprova o custo antes de rodar.
        </p>

        <button
          type="button"
          onClick={onStart}
          style={stagger(3)}
          className="animate-rise-fade mt-1 rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-surface-0 shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_8px_30px_-8px_rgba(249,115,22,0.55)] transition-transform hover:scale-[1.02] hover:bg-accent-hover active:scale-[0.99]"
        >
          Criar vídeo
        </button>

        {(credits || templateCount !== null || scheduleCount !== null) && (
          <div style={stagger(4)} className="animate-rise-fade flex flex-wrap items-center justify-center gap-x-6 gap-y-1 pt-1 text-xs text-fg-tertiary">
            {credits && (
              <span>
                Saldo <span className="font-mono font-medium text-fg-secondary">US$ {credits.balanceUsd.toFixed(2)}</span>
              </span>
            )}
            {templateCount !== null && templateCount > 0 && (
              <span>
                <span className="font-mono font-medium text-fg-secondary">{templateCount}</span> template
                {templateCount === 1 ? "" : "s"} salvo{templateCount === 1 ? "" : "s"}
              </span>
            )}
            {scheduleCount !== null && scheduleCount > 0 && (
              <span>
                <span className="font-mono font-medium text-fg-secondary">{scheduleCount}</span> agendamento
                {scheduleCount === 1 ? "" : "s"} ativo{scheduleCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-16 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage.title}
            style={stagger(5 + i)}
            className="animate-rise-fade flex flex-col items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-1 p-4 text-left transition-colors hover:border-border-default"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-wash text-accent">{stage.icon}</div>
            <p className="text-sm font-semibold text-fg-primary">{stage.title}</p>
            <p className="text-xs leading-relaxed text-fg-tertiary">{stage.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
