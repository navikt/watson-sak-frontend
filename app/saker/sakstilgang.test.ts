import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  erUfordelt,
  kanEndreSak,
  kanLasteOppFiler,
  kanLeseSaksinnhold,
  kanSeFilområdet,
} from "./sakstilgang";

const EIER = "Z111111";
const DELT_MED = "Z222222";
const ANNEN = "Z999999";

function lagSak(
  steg: string,
  eier: string | null = null,
  deltMed: string[] = [DELT_MED],
): KontrollsakResponse {
  return {
    steg,
    saksbehandlere: {
      eier: eier ? { navIdent: eier, navn: "Eier", enhet: "4812" } : null,
      deltMed: deltMed.map((navIdent) => ({ navIdent, navn: "Delt med", enhet: "4812" })),
    },
  } as unknown as KontrollsakResponse;
}

const som = (navIdent: string) => ({ navIdent });

// Speiler tabelltesten i FilTilgangServiceTest i watson-admin-api.
describe("tilgangsregler for saken", () => {
  const ufordelt = lagSak("OPPRETTET");
  const fordelt = lagSak("UTREDES", EIER);

  it.each([
    // [beskrivelse, sak, innlogget, kanSeFilområdet, kanLasteOppFiler, kanEndreSak]
    ["ufordelt sak, hvem som helst", ufordelt, ANNEN, true, true, false],
    ["ufordelt sak med delt-med igjen etter fristilling", ufordelt, DELT_MED, true, true, false],
    ["fordelt sak, eier", fordelt, EIER, true, true, true],
    ["fordelt sak, delt med", fordelt, DELT_MED, true, true, true],
    ["fordelt sak, andre (også leder og den som opprettet)", fordelt, ANNEN, false, false, false],
  ] as const)("%s", (_, sak, navIdent, seFiler, lasteOpp, endre) => {
    expect(kanSeFilområdet(sak, som(navIdent))).toBe(seFiler);
    expect(kanLasteOppFiler(sak, som(navIdent))).toBe(lasteOpp);
    expect(kanEndreSak(sak, som(navIdent))).toBe(endre);
  });

  it("beholder filinnsyn, men fjerner skriveadgang for Holmes-lesere", () => {
    const leser = { ...som(ANNEN), erLesebruker: true };

    expect(kanSeFilområdet(ufordelt, leser)).toBe(true);
    expect(kanLasteOppFiler(ufordelt, leser)).toBe(false);
  });

  it("regner sak uten eier som ufordelt", () => {
    expect(erUfordelt(ufordelt)).toBe(true);
    expect(erUfordelt(fordelt)).toBe(false);
  });
});

describe("kanLeseSaksinnhold", () => {
  it("gir vanlig saksbehandler lesetilgang til avsluttet sak", () => {
    const sak = lagSak("AVSLUTTET");

    expect(kanLeseSaksinnhold(sak, som(ANNEN))).toBe(true);
    expect(kanEndreSak(sak, som(ANNEN))).toBe(false);
  });

  it("gir ikke andre lesetilgang til dokumenter på en ufordelt sak", () => {
    expect(kanLeseSaksinnhold(lagSak("OPPRETTET"), som(ANNEN))).toBe(false);
  });

  it("gir eier og delt med lesetilgang til fordelt sak, men ikke andre", () => {
    const sak = lagSak("UTREDES", EIER);

    expect(kanLeseSaksinnhold(sak, som(EIER))).toBe(true);
    expect(kanLeseSaksinnhold(sak, som(DELT_MED))).toBe(true);
    expect(kanLeseSaksinnhold(sak, som(ANNEN))).toBe(false);
  });
});
