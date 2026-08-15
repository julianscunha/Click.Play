import { useState } from "react";
import { setStoredToken } from "../api.js";

export interface TokenGateProps {
  onSaved(): void;
}

export function TokenGate({ onSaved }: TokenGateProps) {
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <p className="text-sm text-neutral-400">
        Esta API exige um token de acesso. Peça o valor de <code>API_TOKEN</code> a quem configurou o servidor.
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Token de acesso"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-50"
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => {
          setStoredToken(value.trim());
          onSaved();
        }}
        className="rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50"
      >
        Salvar e continuar
      </button>
    </div>
  );
}
