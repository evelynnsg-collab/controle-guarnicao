import type { LocationKey } from "./cg-types";

export interface PlatformDef {
  key: "p23" | "p45" | "p67" | "p8";
  label: string;
  line: string;
  accent: "coral" | "safira" | "jade";
}

/** Platform squares — labels/colors per the operational lines. */
export const PLATFORMS: PlatformDef[] = [
  { key: "p23", label: "Plataforma 2/3", line: "Coral", accent: "coral" },
  { key: "p45", label: "Plataforma 4/5", line: "Coral", accent: "coral" },
  { key: "p67", label: "Plataforma 6/7", line: "Safira", accent: "safira" },
  { key: "p8", label: "Plataforma 8", line: "Jade", accent: "jade" },
];

export interface PostoDef {
  key: "sso" | "bloqueio" | "mezanino";
  label: string;
}

/** Posto buttons — shown together with the platform buttons. */
export const POSTOS: PostoDef[] = [
  { key: "sso", label: "SSO" },
  { key: "bloqueio", label: "Linha de bloqueio" },
  { key: "mezanino", label: "Mezanino" },
];

export interface StationDef {
  key: Exclude<LocationKey, null>;
  label: string;
  line?: string;
  accent: "coral" | "safira" | "jade" | "steel";
}

/** Unified railway buttons (platforms + postos) in the order requested. */
export const STATIONS: StationDef[] = [
  { key: "p23", label: "2/3", line: "Coral", accent: "coral" },
  { key: "p45", label: "4/5", line: "Coral", accent: "coral" },
  { key: "p67", label: "6/7", line: "Safira", accent: "safira" },
  { key: "mezanino", label: "Mezanino", accent: "steel" },
  { key: "bloqueio", label: "Linha de Bloqueio", accent: "steel" },
  { key: "sso", label: "SSO", accent: "steel" },
];

export const LOCATION_LABELS: Record<Exclude<LocationKey, null>, string> = {
  p23: "Plataforma 2/3",
  p45: "Plataforma 4/5",
  p67: "Plataforma 6/7",
  p8: "Plataforma 8",
  sso: "SSO",
  bloqueio: "Linha de bloqueio",
  mezanino: "Mezanino",
};

/** Local options for the Ocorrência form (platforms + postos). */
export const LOCAL_OPTIONS: string[] = [
  "Plataforma 2/3 (Coral)",
  "Plataforma 4/5 (Coral)",
  "Plataforma 6/7 (Safira)",
  "Plataforma 8 (Jade)",
  "SSO",
  "Linha de bloqueio",
  "Mezanino",
];

/** Equipe padrão de AAS para carregar rapidamente. */
export const AAS_NAMES: string[] = [
  "Evelyn",
  "Emylle",
  "Bento",
  "Katia",
  "Daniela Ventura",
  "Natanael",
  "Lieberte",
  "Brasileiro",
  "Barbosa",
  "Edvaldo",
  "Heden",
  "Calixto",
  "Roberto",
];

/** Operational posts used by the automatic scale generator. */
export const ESCALA_POSTOS: string[] = [
  "SSO / Apoio linha de bloqueios",
  "Linha de bloqueios",
  "Linha de bloqueios",
  "Apoio linha de bloqueios",
  "Mezanino / Ronda espaço cultural",
  "Plataforma 6e7 / Ronda plataforma 8",
  "Plataforma 3",
  "Plataforma 3",
  "Plataforma 3 / Após café plataforma 4",
  "Apoiar postos / Ronda área livre",
  "Apoiar postos / Ronda área livre",
  "Mezanino",
  "Linha de bloqueios",
  "Plataforma 6e7",
];
