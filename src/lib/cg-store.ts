import { useSyncExternalStore } from "react";
import type { Agent, Colaborador, Ocorrencia, Profile } from "./cg-types";

const KEYS = {
  profile: "cg_profile",
  agents: "cg_agents",
  ocorrencias: "cg_ocorrencias",
  colaboradores: "cg_colaboradores",
} as const;

const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();

/** Cross-tab channel: broadcasts changes to every other tab on this device. */
const channel: BroadcastChannel | null =
  isBrowser && "BroadcastChannel" in window
    ? new BroadcastChannel("cg_sync")
    : null;

function emit() {
  listeners.forEach((l) => l());
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T, broadcast = true) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
  emit();
  if (broadcast) channel?.postMessage({ key });
}

if (isBrowser) {
  // Other tabs via the storage event (fires only in non-origin tabs).
  window.addEventListener("storage", (e) => {
    if (e.key && Object.values(KEYS).includes(e.key as never)) emit();
  });
  // Other tabs via BroadcastChannel (more reliable, fires immediately).
  channel?.addEventListener("message", () => emit());
  // Re-sync when the tab regains focus / becomes visible.
  window.addEventListener("focus", () => emit());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}



/* ---------- generic getters used by snapshots ---------- */
function getProfileRaw(): Profile | null {
  return read<Profile | null>(KEYS.profile, null);
}
function getAgentsRaw(): Agent[] {
  const existing = read<Agent[] | null>(KEYS.agents, null);
  if (!existing) return [];
  // Remove any leftover demo/seed agents from previous versions.
  const real = existing.filter((a) => !a.id.startsWith("seed-"));
  if (real.length !== existing.length) write(KEYS.agents, real);
  return real;
}
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
function getOcorrenciasRaw(): Ocorrencia[] {
  const all = read<Ocorrencia[]>(KEYS.ocorrencias, []);
  const cutoff = Date.now() - SEVEN_DAYS;
  const fresh = all.filter((o) => (o.createdAt ?? 0) >= cutoff);
  if (fresh.length !== all.length) write(KEYS.ocorrencias, fresh);
  return fresh;
}
function getColaboradoresRaw(): Colaborador[] {
  return read<Colaborador[]>(KEYS.colaboradores, []);
}

/* ---------- cached snapshots (stable references for React) ---------- */
let snapAgents = isBrowser ? getAgentsRaw() : [];
let snapProfile = isBrowser ? getProfileRaw() : null;
let snapOcor = isBrowser ? getOcorrenciasRaw() : [];
let snapColab = isBrowser ? getColaboradoresRaw() : [];

listeners.add(() => {
  snapAgents = getAgentsRaw();
  snapProfile = getProfileRaw();
  snapOcor = getOcorrenciasRaw();
  snapColab = getColaboradoresRaw();
});

/* ---------- public API ---------- */
export const store = {
  setProfile(p: Profile) {
    write(KEYS.profile, p);
    // ensure self is part of the roster
    const agents = getAgentsRaw().filter((a) => a.id !== p.id);
    agents.unshift({
      id: p.id,
      name: p.name,
      platform: p.platform,
      location: p.platform,
      onPost: false,
      interval: "none",
      updatedAt: Date.now(),
    });
    write(KEYS.agents, agents);
  },
  updateSelf(patch: Partial<Agent>) {
    const p = getProfileRaw();
    if (!p) return;
    const agents = getAgentsRaw().map((a) =>
      a.id === p.id ? { ...a, ...patch, updatedAt: Date.now() } : a,
    );
    write(KEYS.agents, agents);
  },
  addOcorrencia(o: Ocorrencia) {
    const list = [o, ...getOcorrenciasRaw()].slice(0, 50);
    write(KEYS.ocorrencias, list);
  },
  setColaboradores(list: Colaborador[]) {
    write(KEYS.colaboradores, list);
  },
  reset() {
    if (!isBrowser) return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    emit();
  },
};

export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, () => snapProfile, () => null);
}
export function useAgents(): Agent[] {
  return useSyncExternalStore(subscribe, () => snapAgents, () => []);
}
export function useOcorrencias(): Ocorrencia[] {
  return useSyncExternalStore(subscribe, () => snapOcor, () => []);
}
export function useColaboradores(): Colaborador[] {
  return useSyncExternalStore(subscribe, () => snapColab, () => []);
}
