import { describe, expect, it } from "vitest";
import { tilVarsel, varselDestinasjon, varselPageBackendResponseSchema } from "./typer";

/** Eksakt kopi av `VarselResponse` slik watson-admin-api serialiserer den. */
const backendVarsel = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  sakId: 102,
  type: "KOMMENTAR",
  tittel: "Ny kommentar på dokument",
  beskrivelse: "Kari Hansen kommenterte i «Kontrollrapport».",
  opprettet: "2026-03-01T09:00:00Z",
  lestTidspunkt: null,
  dokumentId: "9f1c0a2e-0000-4000-8000-000000000001",
  traadId: "11111111-1111-4111-8111-111111111111",
};

describe("varselkontrakt", () => {
  it("parser wrapperen med dokumentId og traadId", () => {
    const side = varselPageBackendResponseSchema.parse({
      items: [backendVarsel],
      page: 1,
      size: 50,
      totalItems: 1,
      totalPages: 1,
    });

    expect(side.items[0].dokumentId).toBe(backendVarsel.dokumentId);
    expect(side.items[0].traadId).toBe(backendVarsel.traadId);
  });

  it("tåler varsler uten dokument- og trådreferanse", () => {
    const varsel = tilVarsel({ ...backendVarsel, dokumentId: null, traadId: null });

    expect(varsel.dokumentId).toBeUndefined();
    expect(varsel.traadId).toBeUndefined();
  });

  it("lenker kommentarvarsler til dokumentets kommentarpanel og riktig tråd", () => {
    const varsel = tilVarsel(backendVarsel);

    expect(varselDestinasjon(varsel, "102")).toBe(
      `/saker/102/dokumenter/${backendVarsel.dokumentId}` +
        `?sidepanel=kommentarer&kommentartraad=${backendVarsel.traadId}`,
    );
  });

  it("lenker til dokumentet uten tråd når varselet mangler traadId", () => {
    const varsel = tilVarsel({ ...backendVarsel, traadId: null });

    expect(varselDestinasjon(varsel, "102")).toBe(
      `/saker/102/dokumenter/${backendVarsel.dokumentId}?sidepanel=kommentarer`,
    );
  });

  it("lenker vanlige varsler til saken", () => {
    const varsel = tilVarsel({ ...backendVarsel, dokumentId: null, traadId: null });

    expect(varselDestinasjon(varsel, "102")).toBe("/saker/102");
  });
});
