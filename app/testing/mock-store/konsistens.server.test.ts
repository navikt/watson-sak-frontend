import { beforeEach, describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { slaOppPerson } from "~/registrer-sak/person-oppslag.mock.server";
import { hentAlleMockPersoner, hentMockPersonNavn } from "~/testing/mock-store/personer.server";
import {
  hentAlleSaker,
  hentFordelingssaker,
  hentMineSaker,
  hentSakMedReferanse,
} from "./alle-saker.server";
import { resetMockStore } from "./reset.server";

describe("mock-store konsistens", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("bruker samme saksobjekt for Mine saker og detaljoppslag", () => {
    for (const mineSak of hentMineSaker()) {
      const detaljSak = hentSakMedReferanse(getSaksreferanse(mineSak.id));

      expect(detaljSak?.id).toBe(mineSak.id);
      expect(detaljSak?.personNavn).toBe(mineSak.personNavn);
    }
  });

  it("lar view-spesifikke spørringer peke på samme saker som samlet sakskatalog", () => {
    const alleSaker = hentAlleSaker();

    for (const sak of [...hentFordelingssaker(), ...hentMineSaker()]) {
      expect(alleSaker).toContain(sak);
    }
  });

  it("viser fordelingssaker i Mine saker når de tildeles innlogget bruker", () => {
    const fordelingssak = hentFordelingssaker()[0];

    if (!fordelingssak) {
      throw new Error("Forventet minst én fordelingssak");
    }

    fordelingssak.saksbehandlere.eier = {
      navIdent: "Z999999",
      navn: "Saks Behandlersen",
      enhet: "Seksjon A",
    };

    expect(hentMineSaker()).toContain(fordelingssak);
  });

  it("har samme navn for samme personident i saker og personoppslag", () => {
    for (const sak of hentAlleSaker()) {
      const personNavn = hentMockPersonNavn(sak.personIdent);

      if (personNavn !== null) {
        expect(sak.personNavn).toBe(personNavn);
      }
    }

    for (const person of hentAlleMockPersoner()) {
      expect(slaOppPerson(person.personIdent)?.person.navn).toBe(person.navn);
    }
  });

  it("lenker ikke personoppslag til saker på andre personer", () => {
    for (const person of hentAlleMockPersoner()) {
      const personOppslag = slaOppPerson(person.personIdent);

      for (const eksisterendeSak of personOppslag?.eksisterendeSaker ?? []) {
        if (!eksisterendeSak.sakId) {
          continue;
        }

        const sak = hentSakMedReferanse(eksisterendeSak.sakId);

        expect(sak?.personIdent).toBe(person.personIdent);
      }
    }
  });
});
