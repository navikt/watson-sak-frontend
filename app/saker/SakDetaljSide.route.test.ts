import { beforeEach, describe, expect, it } from "vitest";
import { mockKontrollsaker } from "~/fordeling/mock-data.server";
import { resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { getBeskrivelse, getKildeText, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentHistorikk, resetHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { action, loader } from "./SakDetaljSide.route";

describe("SakDetaljSide action", () => {
  const utredningSakId = lagMockSakUuid("113", 1);
  const utredningSakRef = getSaksreferanse(utredningSakId);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("logger ikke status_endret ved tildeling når kontrollsaken allerede er under utredning", async () => {
    const sak = hentAlleSaker().find((sak) => sak.id === utredningSakId);

    expect(sak?.status).toBe("UTREDES");

    const historikkFør = hentHistorikk(utredningSakId);
    const statusendringerFør = historikkFør.filter(
      (hendelse) => hendelse.hendelsesType === "STATUS_ENDRET",
    );
    const tildelingerFør = historikkFør.filter(
      (hendelse) => hendelse.hendelsesType === "SAK_TILDELT",
    );

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("saksbehandler", "Kari Nordmann");

    await action({
      request: new Request(`http://localhost/saker/${utredningSakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: utredningSakRef },
    } as Route.ActionArgs);

    const historikkEtter = hentHistorikk(utredningSakId);
    const statusendringerEtter = historikkEtter.filter(
      (hendelse) => hendelse.hendelsesType === "STATUS_ENDRET",
    );
    const tildelingerEtter = historikkEtter.filter(
      (hendelse) => hendelse.hendelsesType === "SAK_TILDELT",
    );

    expect(statusendringerEtter).toHaveLength(statusendringerFør.length);
    expect(tildelingerEtter).toHaveLength(tildelingerFør.length + 1);
  });
});

describe("SakDetaljSide helper-integrasjon", () => {
  const fordelingSakId = lagMockSakUuid("101", 1);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
  });

  it("leser personident, kilde, ytelser og beskrivelse via helpers for backend-shapede saker", () => {
    const sak = hentAlleSaker().find((sak) => sak.id === fordelingSakId);

    expect(sak).toBeDefined();

    if (!sak) {
      throw new Error("Fant ikke forventet legacy-sak i testdata");
    }

    expect(getPersonIdent(sak)).toBe("12345678901");
    expect(getKildeText(sak)).toBe("Ekstern");
    expect(getYtelseTyper(sak)).toEqual(["Enslig forsørger"]);
    expect(getBeskrivelse(sak)).toBe("Tips om mulig feil i enslig-forsørger-sak.");
  });

  it("returnerer backend-shapede saker i samlet mockdatasett for øvrige flows", () => {
    const sak = hentAlleSaker().find((eksisterendeSak) => eksisterendeSak.id === fordelingSakId);

    expect(sak).toBeDefined();

    if (!sak) {
      throw new Error("Fant ikke forventet legacy-sak i testdata");
    }

    expect("personIdent" in sak).toBe(true);
  });
});

describe("SakDetaljSide kontrollsak-runtime", () => {
  const mineSakId = lagMockSakUuid("201", 2);
  const mineSakRef = getSaksreferanse(mineSakId);

  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("loader returnerer backend-shapet kontrollsak når sakId peker på kontrollsak", () => {
    const kontrollsakId = mockKontrollsaker[0].id;
    const kontrollsakRef = getSaksreferanse(kontrollsakId);

    const resultat = loader({ params: { sakId: kontrollsakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(kontrollsakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.personIdent === resultat.sak.personIdent)).toBe(true);
    expect(resultat.andreSaker.every((s) => s.id !== resultat.sak.id)).toBe(true);
  });

  it("loader returnerer backend-shapet mine sak når sakId peker på backend-shaped mine saker", () => {
    const resultat = loader({ params: { sakId: mineSakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(mineSakId);
    expect("personIdent" in resultat.sak).toBe(true);
    expect(Array.isArray(resultat.andreSaker)).toBe(true);
  });

  it("beholder hentAlleSaker som backend-shaped aggregat", () => {
    const saker = hentAlleSaker();

    expect(saker.length).toBeGreaterThan(0);
    expect(saker.every((sak) => "personIdent" in sak)).toBe(true);
  });

  it("oppdaterer kontrollsak-status med backend-enum ved tildeling", async () => {
    const kontrollsak = mockKontrollsaker[0];
    const kontrollsakRef = getSaksreferanse(kontrollsak.id);

    expect(kontrollsak.status).toBe("OPPRETTET");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("saksbehandler", "Kari Nordmann");

    await action({
      request: new Request(`http://localhost/saker/${kontrollsakRef}`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: kontrollsakRef },
    } as Route.ActionArgs);

    expect(kontrollsak.status).toBe("UTREDES");
  });
});
