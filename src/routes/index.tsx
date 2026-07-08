import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { ClipboardList, LayoutGrid, LogOut, Settings } from "lucide-react";
import { Cadastro } from "@/components/cg/Cadastro";
import { GuarnicaoTab } from "@/components/cg/GuarnicaoTab";
import { OcorrenciaTab } from "@/components/cg/OcorrenciaTab";
import { AdminTab } from "@/components/cg/AdminTab";
import { CreditBar } from "@/components/cg/CreditBar";
import { EscadasNotif } from "@/components/cg/EscadasNotif";
import { store, useProfile } from "@/lib/cg-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Guarnição — Linhas 11, 12 e 13" },
      {
        name: "description",
        content:
          "Painel operacional em tempo real para gestão de guarnição de segurança nas estações das Linhas 11-Coral, 12-Safira e 13-Jade.",
      },
      { property: "og:title", content: "Controle de Guarnição" },
      {
        property: "og:description",
        content: "Gestão de guarnição de segurança em tempo real.",
      },
    ],
  }),
  component: App,
});

type Tab = "guarnicao" | "ocorrencia" | "admin";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "guarnicao", label: "Guarnição", icon: LayoutGrid },
  { key: "ocorrencia", label: "Ocorrência", icon: ClipboardList },
  { key: "admin", label: "Admin", icon: Settings },
];

function App() {
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>("guarnicao");

  if (!profile) {
    return (
      <>
        <CreditBar />
        <Cadastro />
        <Toaster theme="dark" position="top-center" />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <CreditBar />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-tight">
          {TABS.find((t) => t.key === tab)?.label}
        </h1>
        <button
          type="button"
          onClick={() => {
            if (confirm("Sair do app? Você volta pra tela inicial e precisa entrar de novo.")) {
              store.logout();
            }
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground"
          aria-label="Sair"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </header>

      <main className="flex-1 pb-20">
        {tab === "guarnicao" && <GuarnicaoTab />}
        {tab === "ocorrencia" && <OcorrenciaTab />}
        {tab === "admin" && <AdminTab />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "scale-110")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <EscadasNotif />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
