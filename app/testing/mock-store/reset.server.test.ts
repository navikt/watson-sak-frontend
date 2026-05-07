import { beforeEach, describe, expect, it } from "vitest";
import { hentMockState, resetDefaultSession } from "./session.server";
import { hentFordelingssaker, hentMineSaker } from "./alle-saker.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("shared mock-store", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("tilbakestiller mocktilstand via resetDefaultSession", () => {
    const fordelingssaker = hentFordelingssaker(state());
    fordelingssaker[0].status = "UTREDES";

    expect(hentFordelingssaker(state())[0]?.status).toBe("UTREDES");

    resetDefaultSession();

    expect(hentFordelingssaker(state())[0]?.status).toBe("OPPRETTET");
  });

  it("tilbakestiller flere saksdomener via sentral reset", () => {
    hentFordelingssaker(state())[0].status = "UTREDES";
    hentMineSaker(state())[0].status = "AVSLUTTET";

    resetDefaultSession();

    expect(hentFordelingssaker(state())[0]?.status).toBe("OPPRETTET");
    expect(hentMineSaker(state())[0]?.status).toBe("UTREDES");
  });
});
