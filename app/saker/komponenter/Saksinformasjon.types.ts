import type { YtelseRadVerdier } from "~/registrer-sak/skjema-helpers";
import type { KontrollsakResponse } from "~/saker/types.backend";

export type RedigerSaksinformasjonData = {
  kategori: string;
  kilde: string;
  misbruktype: string[];
  merking: string[];
  arbeidsgivere: string[];
  ytelser: YtelseRadVerdier[];
};

export type RedigerSaksinformasjonResultat =
  | { ok: true; sak?: KontrollsakResponse }
  | {
      ok: false;
      feil: Record<string, string[]>;
      verdier?: RedigerSaksinformasjonData;
    };
