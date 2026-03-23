import { beforeEach, describe, expect, it } from "vitest";
import { resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentHistorikk, resetHistorikk } from "./historikk/mock-data.server";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { action } from "./SakDetaljSide.route";

describe("SakDetaljSide action", () => {
  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("logger ikke status_endret ved tildeling nar saken allerede er under utredning", async () => {
    const sak = hentAlleSaker().find((sak) => sak.id === "113");

    expect(sak?.status).toBe("under utredning");

    const historikkFør = hentHistorikk("113");
    const statusendringerFør = historikkFør.filter((hendelse) => hendelse.type === "status_endret");
    const tildelingerFør = historikkFør.filter((hendelse) => hendelse.type === "tildelt");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("saksbehandler", "Kari Nordmann");

    await action({
      request: new Request("http://localhost/saker/113", {
        method: "POST",
        body: formData,
      }),
      params: { sakId: "113" },
    } as Route.ActionArgs);

    const historikkEtter = hentHistorikk("113");
    const statusendringerEtter = historikkEtter.filter(
      (hendelse) => hendelse.type === "status_endret",
    );
    const tildelingerEtter = historikkEtter.filter((hendelse) => hendelse.type === "tildelt");

    expect(statusendringerEtter).toHaveLength(statusendringerFør.length);
    expect(tildelingerEtter).toHaveLength(tildelingerFør.length + 1);
  });
});
