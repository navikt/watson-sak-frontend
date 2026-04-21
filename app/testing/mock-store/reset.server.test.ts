import { beforeEach, describe, expect, it } from "vitest";
import {
  mockKontrollsaker as adapterFordeling,
  resetMockSaker,
} from "~/fordeling/mock-data.server";
import {
  mockMineKontrollsaker as adapterMineSaker,
  resetMockMineSaker,
} from "~/mine-saker/mock-data.server";
import { hentNesteStatusFraBero, settForrigeStatus } from "~/saker/mock-uuid";
import { mockKontrollsaker as storeFordeling } from "./saker/fordeling.server";
import { mockMineKontrollsaker as storeMineSaker } from "./saker/mine-saker.server";
import { resetMockStore } from "./reset.server";

describe("shared mock-store", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("eksponerer samme live state gjennom adapter og store", () => {
    adapterFordeling[0].status = "UTREDES";

    expect(storeFordeling[0]?.status).toBe("UTREDES");

    resetMockSaker();

    expect(adapterFordeling[0]?.status).toBe("UFORDELT");
    expect(storeFordeling[0]?.status).toBe("UFORDELT");
  });

  it("tilbakestiller flere saksdomener via sentral reset", () => {
    adapterFordeling[0].status = "UTREDES";
    adapterMineSaker[0].status = "AVSLUTTET";

    resetMockStore();

    expect(storeFordeling[0]?.status).toBe("UFORDELT");
    expect(storeMineSaker[0]?.status).toBe("UTREDES");

    resetMockMineSaker();
    expect(adapterMineSaker[0]?.status).toBe("UTREDES");
  });

  it("tilbakestiller lagret forrige status ved reset", () => {
    const sak = adapterFordeling[0];

    settForrigeStatus(sak.id, "VENTER_PA_VEDTAK");
    sak.status = "I_BERO";

    expect(hentNesteStatusFraBero(sak)).toBe("VENTER_PA_VEDTAK");

    resetMockStore();

    expect(hentNesteStatusFraBero(adapterFordeling[0])).toBe("UTREDES");
  });
});
