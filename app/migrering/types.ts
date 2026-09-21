export interface MigreringKandidat {
  sid: number;
  pid: string;
  fnr: string;
  navn: string;
  opprettetIAccess: string;
  sakstype: string;
  tilbakebetkrav?: number;
  kravbrutto?: number;
  stoppetUtbetaling?: number;
  ansvarligNavIdent?: string | null;
  saksbehandlerStatus: "SAKSBEHANDLER_FELT" | "SOKEHENDELSE_FALLBACK" | "UFORDELT";
  alleredeOverfort: boolean;
  watsonSakId?: string;
  ytelser?: {
    type: string;
    fra: string;
    til: string;
    belop?: string;
  }[];
}
