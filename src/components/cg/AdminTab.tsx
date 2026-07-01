import { useState } from "react";
import { toast } from "sonner";
import { Lock, Plus, Trash2, Users } from "lucide-react";
import { store, useColaboradores } from "@/lib/cg-store";
import type { Colaborador } from "@/lib/cg-types";
import { AAS_NAMES } from "@/lib/cg-constants";
import { EscalaEditor } from "@/components/cg/EscalaEditor";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring";

function Login({ onOk }: { onOk: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  function submit() {
    if (user === "admin" && pass === "admin@123") onOk();
    else toast.error("Credenciais inválidas");
  }
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-xs rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Acesso restrito</h2>
        </div>
        <input className={cn(inputCls, "mb-3")} placeholder="Usuário" value={user} onChange={(e) => setUser(e.target.value)} />
        <input className={cn(inputCls, "mb-5")} type="password" placeholder="Senha" value={pass} onChange={(e) => setPass(e.target.value)} />
        <button type="button" onClick={submit} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
          Entrar
        </button>
      </div>
    </div>
  );
}

export function AdminTab() {
  const [authed, setAuthed] = useState(false);
  const colaboradores = useColaboradores();
  const [novo, setNovo] = useState("");

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  function add() {
    if (novo.trim().length < 2) return;
    const next: Colaborador[] = [
      ...colaboradores,
      { id: crypto.randomUUID(), name: novo.trim(), status: "T", retorno: null },
    ];
    store.setColaboradores(next);
    setNovo("");
  }
  function remove(id: string) {
    store.setColaboradores(colaboradores.filter((c) => c.id !== id));
  }
  function toggle(id: string) {
    store.setColaboradores(
      colaboradores.map((c) => (c.id === id ? { ...c, status: c.status === "T" ? "F" : "T" } : c)),
    );
  }
  function setRetorno(id: string, retorno: "2d" | "1d" | null) {
    store.setColaboradores(
      colaboradores.map((c) => (c.id === id ? { ...c, retorno } : c)),
    );
  }
  function loadAAS() {
    const existing = new Set(colaboradores.map((c) => c.name.toLowerCase()));
    const added = AAS_NAMES.filter((n) => !existing.has(n.toLowerCase())).map(
      (name) => ({ id: crypto.randomUUID(), name, status: "T" as const, retorno: null }),
    );
    if (added.length === 0) {
      toast.info("Equipe AAS já está carregada");
      return;
    }
    store.setColaboradores([...colaboradores, ...added]);
    toast.success(`${added.length} agente(s) da equipe AAS carregado(s)`);
  }

  return (
    <div className="space-y-5 px-4 pb-6 pt-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Equipe</p>
          <button
            type="button"
            onClick={loadAAS}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium"
          >
            <Users className="size-3.5" /> Carregar equipe AAS
          </button>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            className={inputCls}
            placeholder="Nome do colaborador"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button type="button" onClick={add} className="flex shrink-0 items-center rounded-lg bg-primary px-3 text-primary-foreground">
            <Plus className="size-5" />
          </button>
        </div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
          <b>2d</b> = folgou há 2 dias → vai para a <b>Linha de bloqueio</b>.
          {" "}<b>1d</b> = folgou há 1 dia → vai para a <b>SSO</b>.
        </p>
        <div className="space-y-2">
          {colaboradores.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum colaborador.</p>
          )}
          {colaboradores.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <span className="flex-1 truncate text-sm">{c.name}</span>
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["2d", "1d"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRetorno(c.id, c.retorno === r ? null : r)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-semibold",
                      c.retorno === r
                        ? r === "2d"
                          ? "bg-primary text-primary-foreground"
                          : "bg-status-warn/30 text-status-warn"
                        : "text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-sm font-bold",
                  c.status === "T" ? "bg-status-ok/20 text-status-ok" : "bg-status-bad/20 text-status-bad",
                )}
              >
                {c.status}
              </button>
              <button type="button" onClick={() => remove(c.id)} className="text-muted-foreground">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>


      <div className="rounded-2xl border border-border bg-card p-4">
        <EscalaEditor />
      </div>
    </div>
  );
}
