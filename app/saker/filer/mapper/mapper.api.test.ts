import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { hentFilerForSak, leggTilFil } from "~/testing/mock-store/filer.server";
import { hentMapperForSak } from "~/testing/mock-store/mapper.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { action } from "./mapper.api";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
  }),
}));

const testRequest = new Request("http://localhost");
const state = () => hentMockState(testRequest);

const meg: KontrollsakSaksbehandler = { navIdent: "Z999999", navn: "Test", enhet: "4812" };

function settOppSak({ eier = true } = {}) {
  const sak = hentFordelingssaker(state())[0];
  sak.saksbehandlere.eier = eier ? meg : { ...meg, navIdent: "Z111111" };
  sak.saksbehandlere.deltMed = [];
  sak.steg = "UTREDES";
  return { sakId: String(sak.id), ref: getSaksreferanse(sak.id) };
}

async function send(ref: string, body: unknown) {
  const request = new Request(`http://localhost/api/saker/${ref}/mapper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const svar = await action({ request, params: { sakId: ref }, context: {} } as never);
  // Feil returneres som `data(...)` med status, suksess som et vanlig objekt.
  return svar && typeof svar === "object" && "data" in svar
    ? { status: (svar as { init?: { status?: number } }).init?.status, ...(svar.data as object) }
    : { status: 200, ...(svar as object) };
}

function stier(sakId: string) {
  return hentMapperForSak(state(), sakId).map((mappe) => mappe.sti);
}

describe("mapper.api", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("oppretter en nestet mappe og manglende overordnede mapper", async () => {
    const { sakId, ref } = settOppSak();

    expect(await send(ref, { handling: "opprett", sti: " Bank / Utskrifter " })).toMatchObject({
      ok: true,
    });
    expect(stier(sakId)).toEqual(expect.arrayContaining(["Bank", "Bank/Utskrifter"]));
  });

  it("avviser mappe som finnes fra før med 409", async () => {
    const { ref } = settOppSak();
    await send(ref, { handling: "opprett", sti: "Bank" });

    expect(await send(ref, { handling: "opprett", sti: "Bank" })).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("avviser ugyldige mappenavn med 400", async () => {
    const { ref } = settOppSak();
    expect(await send(ref, { handling: "opprett", sti: "Bank/../hemmelig" })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("flytter en mappe med innhold, og filene følger med", async () => {
    const { sakId, ref } = settOppSak();
    await send(ref, { handling: "opprett", sti: "Bank/Utskrifter" });
    await send(ref, { handling: "opprett", sti: "Arkiv" });
    const fil = leggTilTestfil(sakId);
    await send(ref, { handling: "flytt-fil", id: fil.id, mappe: "Bank/Utskrifter" });

    expect(
      await send(ref, { handling: "endre", fraSti: "Bank", tilSti: "Arkiv/Bank" }),
    ).toMatchObject({ ok: true });

    expect(stier(sakId)).toEqual(
      expect.arrayContaining(["Arkiv", "Arkiv/Bank", "Arkiv/Bank/Utskrifter"]),
    );
    expect(stier(sakId)).not.toContain("Bank");
    expect(hentFilerForSak(state(), sakId).find((f) => f.id === fil.id)?.mappe).toBe(
      "Arkiv/Bank/Utskrifter",
    );
  });

  it("lar ikke en mappe flyttes inn i seg selv", async () => {
    const { ref } = settOppSak();
    await send(ref, { handling: "opprett", sti: "Bank/Utskrifter" });

    expect(
      await send(ref, { handling: "endre", fraSti: "Bank", tilSti: "Bank/Utskrifter/Bank" }),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("sletter bare tomme mapper", async () => {
    const { sakId, ref } = settOppSak();
    await send(ref, { handling: "opprett", sti: "Bank/Utskrifter" });

    expect(await send(ref, { handling: "slett", sti: "Bank" })).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(await send(ref, { handling: "slett", sti: "Bank/Utskrifter" })).toMatchObject({
      ok: true,
    });
    expect(stier(sakId)).not.toContain("Bank/Utskrifter");
  });

  it("flytter en fil tilbake til rotnivå", async () => {
    const { sakId, ref } = settOppSak();
    await send(ref, { handling: "opprett", sti: "Bank" });
    const fil = leggTilTestfil(sakId);
    await send(ref, { handling: "flytt-fil", id: fil.id, mappe: "Bank" });

    expect(await send(ref, { handling: "flytt-fil", id: fil.id, mappe: null })).toMatchObject({
      ok: true,
    });
    expect(hentFilerForSak(state(), sakId).find((f) => f.id === fil.id)?.mappe).toBeNull();
  });

  it("avviser flytting til en mappe som ikke finnes", async () => {
    const { sakId, ref } = settOppSak();
    const fil = leggTilTestfil(sakId);

    expect(
      await send(ref, { handling: "flytt-fil", id: fil.id, mappe: "Finnes ikke" }),
    ).toMatchObject({ ok: false, status: 404 });
  });

  it("gir 403 når brukeren ikke kan redigere dokumenter på saken", async () => {
    const { ref } = settOppSak({ eier: false });

    await expect(send(ref, { handling: "opprett", sti: "Bank" })).rejects.toMatchObject({
      init: { status: 403 },
    });
  });
});

function leggTilTestfil(sakId: string) {
  return leggTilFil(
    state(),
    sakId,
    new File(["innhold"], "test.pdf", { type: "application/pdf" }),
    "Z999999",
  );
}
