export type IntervalKind = "none" | "almoco" | "cafe";

/** Location keys: platform squares + posto buttons (all selectable together). */
export type LocationKey =
  | "p23"
  | "p45"
  | "p67"
  | "p8"
  | "sso"
  | "bloqueio"
  | "mezanino"
  | null;

export interface Agent {
  id: string;
  name: string;
  /** The agent's assigned station (platform or posto). */
  platform: Exclude<LocationKey, null>;
  /** Where the agent is currently acting (platform or posto). */
  location: LocationKey;
  onPost: boolean;
  interval: IntervalKind;
  updatedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  platform: Exclude<LocationKey, null>;
}

export interface Ocorrencia {
  id: string;
  /** APS (número/identificação do atendimento) */
  aps: string;
  linha: string;
  estacao: string;
  local: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  apsNumero: string;
  complexidade: string;
  /** Dados da pessoa atendida */
  passNome: string;
  passIdade: string;
  passDocumento: string;
  passTelefone: string;
  condicoesInformadas: string;
  encaminhamento: string;
  prontoSocorro: string;
  /** Lista de AAS envolvidos: [{nome, matricula}] */
  aasLista: Array<{ nome: string; matricula: string }>;
  createdAt: number;
  /** IDs of photos attached to this report, stored separately in IndexedDB (see cg-photos.ts). */
  fotos?: string[];
}

export interface DelecaoLog {
  id: string;
  ocorrenciaId: string;
  resumo: string;
  apagadoPor: string;
  motivo: string;
  apagadoEm: number;
}

export interface Colaborador {
  id: string;
  name: string;
  /** T = trabalha, F = folga */
  status: "T" | "F";
  /**
   * Retorno de folga: "2d" = folga há 2 dias (vai para Linha de bloqueio),
   * "1d" = folga há 1 dia (vai para SSO). null = sem prioridade.
   */
  retorno?: "2d" | "1d" | null;
}
