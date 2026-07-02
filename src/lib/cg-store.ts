import { useSyncExternalStore } from "react";
import type { Agent, Colaborador, DelecaoLog, Ocorrencia, Profile } from "./cg-types";
import { fbDeleteChild, fbGetMap, fbSetChild, fbSetMap } from "./cg-fb";

const KEYS = {
  profile: "cg_profile",
  agents: "cg_agents",
  ocorrencias: "cg_ocorrencias",
  colaboradores: "cg_colaboradores",
  delecoes: "cg_delecoes",
} as const;

const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();

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

/** Write to the local cache only (no cloud push) — used for merges coming FROM Firebase. */
function writeLocal<T>(key: string, value: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ---------- generic getters used by snapshots (local cache) ---------- */
function getProfileRaw(): Profile | null {
  return read<Profile | null>(KEYS.profile, null);
}
function getAgentsRaw(): Agent[] {
  const existing = read<Agent[] | null>(KEYS.agents, null);
  if (!existing) return [];
  return existing.filter((a) => !a.id.startsWith("seed-"));
}
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
function getOcorrenciasRaw(): Ocorrencia[] {
  const all = read<Ocorrencia[]>(KEYS.ocorrencias, []);
  const cutoff = Date.now() - SEVEN_DAYS;
  return all.filter((o) => (o.createdAt ?? 0) >= cutoff);
}
function getColaboradoresRaw(): Colaborador[] {
  return read<Colaborador[]>(KEYS.colaboradores, []);
}
function getDelecoesRaw(): DelecaoLog[] {
  return read<DelecaoLog[]>(KEYS.delecoes, []);
}

/* ---------- cached snapshots (stable references for React) ---------- */
let snapAgents = isBrowser ? getAgentsRaw() : [];
let snapProfile = isBrowser ? getProfileRaw() : null;
let snapOcor = isBrowser ? getOcorrenciasRaw() : [];
let snapColab = isBrowser ? getColaboradoresRaw() : [];

function recomputeSnapshots() {
  snapAgents = getAgentsRaw();
  snapProfile = getProfileRaw();
  snapOcor = getOcorrenciasRaw();
  snapColab = getColaboradoresRaw();
}
listeners.add(recomputeSnapshots);

/* ---------- Firebase sync: agents / ocorrencias / colaboradores share across devices ---------- */
async function syncAgentsFromCloud() {
  const map = await fbGetMap<Agent>("agents");
  const list = Object.values(map).filter((a) => !a.id.startsWith("seed-"));
  if (list.length === 0 && Object.keys(map).length === 0) return; // nothing in cloud yet, keep local
  writeLocal(KEYS.agents, list);
  emit();
}

async function syncOcorrenciasFromCloud() {
  const map = await fbGetMap<Ocorrencia>("ocorrencias");
  const cutoff = Date.now() - SEVEN_DAYS;
  const fresh: Ocorrencia[] = [];
  const expiredIds: string[] = [];
  const expiredPhotoIds: string[] = [];
  Object.values(map).forEach((o) => {
    if ((o.createdAt ?? 0) >= cutoff) fresh.push(o);
    else {
      expiredIds.push(o.id);
      if (o.fotos?.length) expiredPhotoIds.push(...o.fotos);
    }
  });
  fresh.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  writeLocal(KEYS.ocorrencias, fresh.slice(0, 200));
  expiredIds.forEach((id) => fbDeleteChild(`ocorrencias/${id}`));
  if (expiredPhotoIds.length && isBrowser) {
    import("./cg-photos").then(({ deletePhotos }) => deletePhotos(expiredPhotoIds));
  }
  emit();
}

async function syncColaboradoresFromCloud() {
  const map = await fbGetMap<Colaborador>("colaboradores");
  const list = Object.values(map);
  if (list.length === 0 && Object.keys(map).length === 0) return;
  writeLocal(KEYS.colaboradores, list);
  emit();
}

async function refreshAllFromCloud() {
  await Promise.all([syncAgentsFromCloud(), syncOcorrenciasFromCloud(), syncColaboradoresFromCloud()]);
}

if (isBrowser) {
  // Same-device cross-tab: storage/broadcast/focus events, same as before.
  const channel: BroadcastChannel | null =
    "BroadcastChannel" in window ? new BroadcastChannel("cg_sync") : null;
  window.addEventListener("storage", (e) => {
    if (e.key && Object.values(KEYS).includes(e.key as never)) emit();
  });
  channel?.addEventListener("message", () => emit());
  window.addEventListener("focus", () => refreshAllFromCloud());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAllFromCloud();
  });

  // Cross-device: poll the shared Firebase database periodically while visible.
  refreshAllFromCloud();
  setInterval(() => {
    if (document.visibilityState === "visible") refreshAllFromCloud();
  }, 5000);
}

/* ---------- public API ---------- */
export const store = {
  setProfile(p: Profile) {
    writeLocal(KEYS.profile, p);
    emit();
    // ensure self is part of the shared roster
    const agents = getAgentsRaw().filter((a) => a.id !== p.id);
    const self: Agent = {
      id: p.id,
      name: p.name,
      platform: p.platform,
      location: p.platform,
      onPost: false,
      interval: "none",
      updatedAt: Date.now(),
    };
    agents.unshift(self);
    writeLocal(KEYS.agents, agents);
    emit();
    fbSetChild(`agents/${p.id}`, self);
  },
  updateSelf(patch: Partial<Agent>) {
    const p = getProfileRaw();
    if (!p) return;
    const agents = getAgentsRaw().map((a) =>
      a.id === p.id ? { ...a, ...patch, updatedAt: Date.now() } : a,
    );
    writeLocal(KEYS.agents, agents);
    emit();
    const updated = agents.find((a) => a.id === p.id);
    if (updated) fbSetChild(`agents/${p.id}`, updated);
  },
  addOcorrencia(o: Ocorrencia) {
    const list = [o, ...getOcorrenciasRaw()].slice(0, 200);
    writeLocal(KEYS.ocorrencias, list);
    emit();
    fbSetChild(`ocorrencias/${o.id}`, o);
  },
  /** Delete an occurrence, clean up its (local) photos, and keep an audit trail of who/why. */
  removeOcorrencia(id: string, apagadoPor: string, motivo: string) {
    const list = getOcorrenciasRaw();
    const target = list.find((o) => o.id === id);
    if (!target) return;
    writeLocal(KEYS.ocorrencias, list.filter((o) => o.id !== id));
    emit();
    fbDeleteChild(`ocorrencias/${id}`);
    if (target.fotos?.length && isBrowser) {
      import("./cg-photos").then(({ deletePhotos }) => deletePhotos(target.fotos!));
    }
    const log: DelecaoLog = {
      id: crypto.randomUUID(),
      ocorrenciaId: target.id,
      resumo: `${target.data} · ${target.local} · ${target.ocorrencia.slice(0, 80)}`,
      apagadoPor,
      motivo,
      apagadoEm: Date.now(),
    };
    const logs = [log, ...getDelecoesRaw()].slice(0, 200);
    writeLocal(KEYS.delecoes, logs);
    fbSetChild(`delecoes/${log.id}`, log);
  },
  setColaboradores(list: Colaborador[]) {
    writeLocal(KEYS.colaboradores, list);
    emit();
    const map: Record<string, Colaborador> = {};
    list.forEach((c) => (map[c.id] = c));
    fbSetMap("colaboradores", map);
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
