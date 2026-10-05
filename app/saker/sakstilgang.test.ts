import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { harDirekteSakstilgang, kanLeseSaksinnhold } from "./sakstilgang";

function lagSak(steg: string, eier: string | null = null): KontrollsakResponse {
  return {
    steg,
    saksbehandlere: {
      eier: eier ? { navIdent: eier, navn: "Eier", enhet: "4812" } : null,
      deltMed: [],
    },
  } as unknown as KontrollsakResponse;
}

const saksbehandler = { navIdent: "Z999999", erLeder: false };

describe("kanLeseSaksinnhold", () => {
  it("gir vanlig saksbehandler lesetilgang til avsluttet sak", () => {
    const sak = lagSak("AVSLUTTET");

    expect(kanLeseSaksinnhold(sak, saksbehandler)).toBe(true);
    expect(harDirekteSakstilgang(sak, saksbehandler)).toBe(false);
  });

  it("gir ikke vanlig saksbehandler lesetilgang til aktiv sak uten direkte tilgang", () => {
    expect(kanLeseSaksinnhold(lagSak("UTREDES", "Z111111"), saksbehandler)).toBe(false);
  });

  it("gir eier og leder lesetilgang til aktiv sak", () => {
    expect(kanLeseSaksinnhold(lagSak("UTREDES", "Z999999"), saksbehandler)).toBe(true);
    expect(kanLeseSaksinnhold(lagSak("UTREDES"), { ...saksbehandler, erLeder: true })).toBe(true);
  });
});
