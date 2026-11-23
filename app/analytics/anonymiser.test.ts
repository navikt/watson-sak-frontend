import { describe, expect, it } from "vitest";
import { anonymiserUmamiPayload } from "./anonymiser";

const vask = (payload: Record<string, unknown>) => anonymiserUmamiPayload("event", payload);

describe("anonymiserUmamiPayload", () => {
  it("erstatter sak- og dokument-ID og fjerner query og hash", () => {
    expect(vask({ url: "/saker/WS-123/dokumenter/abc?x=1#h" }).url).toBe(
      "/saker/:sakId/dokumenter/:docId",
    );
  });

  it("beholder origin i fulle URL-er", () => {
    expect(vask({ referrer: "https://host.nav.no/saker/42" }).referrer).toBe(
      "https://host.nav.no/saker/:sakId",
    );
  });

  it("fjerner query-streng fra søk", () => {
    expect(vask({ url: "/søk?q=12345678901" }).url).toBe("/søk");
  });

  it("erstatter tittel på saksruter", () => {
    const resultat = vask({ url: "https://host/saker/WS-1", title: "Sak WS-1 – Watson Sak" });
    expect(resultat.title).toBe("/saker/:sakId");
  });

  it("beholder tittel på andre ruter", () => {
    expect(vask({ url: "/mine-saker", title: "Mine saker" }).title).toBe("Mine saker");
  });

  it("vasker destinasjon i navigere-hendelsen", () => {
    expect(vask({ data: { destinasjon: "/saker/ABC-1" } }).data).toEqual({
      destinasjon: "/saker/:sakId",
    });
  });

  it("vasker nestede data og fjerner forbudte nøkler", () => {
    const resultat = vask({
      data: { sakId: "1", docId: "2", fnr: "123", kilde: "meny", liste: [{ sti: "/saker/9" }] },
    });
    expect(resultat.data).toEqual({ kilde: "meny", liste: [{ sti: "/saker/:sakId" }] });
  });

  it("beholder klassifisering for hurtigsøk", () => {
    const data = { kilde: "hurtigsøk", klassifisering: "Fødsels- eller D-nummer" };
    expect(vask({ data }).data).toEqual(data);
  });

  it("muterer ikke input", () => {
    const input = { url: "/saker/1", data: { sakId: "1" } };
    vask(input);
    expect(input).toEqual({ url: "/saker/1", data: { sakId: "1" } });
  });

  it("fungerer etter serialisering til inline-script", () => {
    const serialisert = new Function(`return ${anonymiserUmamiPayload.toString()}`)();
    expect(serialisert("pageview", { url: "/saker/1?a=b" }).url).toBe("/saker/:sakId");
  });
});
