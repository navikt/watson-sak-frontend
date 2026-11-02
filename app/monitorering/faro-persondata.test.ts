import type { TransportItem } from "@grafana/faro-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "~/logging/logging";
import { fjernPersondata } from "./faro-persondata";

describe("fjernPersondata", () => {
  it("maskerer fnr og fjerner query fra URL-er i hele payloaden", () => {
    const item = {
      type: "exception",
      payload: {
        value: "Fant ikke person 12345678901",
        stacktrace: { frames: [{ filename: "https://watson/saker/1?fnr=12345678901" }] },
      },
      meta: { page: { url: "/sok?ident=12345678901#topp" } },
    } as unknown as TransportItem;

    const vasket = JSON.stringify(fjernPersondata(item));

    expect(vasket).not.toContain("12345678901");
    expect(vasket).toContain("Fant ikke person ***********");
    expect(vasket).toContain('"filename":"https://watson/saker/1"');
    expect(vasket).toContain('"url":"/sok"');
  });

  it("fjerner query og fragment fra URL-er midt i en melding", () => {
    const item = {
      payload: {
        value: "Request failed: https://watson.example/sok?navn=Ola%20Nordmann#x (status 500)",
        message: "Feil ved /saker/1?side=2&navn=Kari, prøv igjen",
      },
    } as unknown as TransportItem;

    const vasket = JSON.stringify(fjernPersondata(item));

    expect(vasket).not.toContain("Ola");
    expect(vasket).not.toContain("Kari");
    expect(vasket).toContain("Request failed: https://watson.example/sok (status 500)");
    expect(vasket).toContain("Feil ved /saker/1, prøv igjen");
  });

  it("lar tall som ikke er 11 siffer stå", () => {
    const item = { payload: { sakId: "1234", tid: 1730000000000 } } as unknown as TransportItem;
    expect(fjernPersondata(item)).toEqual(item);
  });
});

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logger ikke feilmelding eller stack fra Error utenfor development", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("Noe feilet", { feil: new Error("Person 12345678901 finnes ikke") });

    const logglinje = JSON.stringify(error.mock.calls);
    expect(logglinje).not.toContain("12345678901");
    expect(logglinje).toContain("Error");
  });
});
