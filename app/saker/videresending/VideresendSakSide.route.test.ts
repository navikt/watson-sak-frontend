import { beforeEach, describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { hentHistorikk, resetHistorikk } from "~/saker/historikk/mock-data.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { Route } from "./+types/VideresendSakSide.route";
import { action, loader } from "./VideresendSakSide.route";

describe("VideresendSakSide loader", () => {
  beforeEach(() => {
    resetHistorikk();
  });

  it("kan slå opp backend-shapet mine sak via lokal detalj-seam", () => {
    const sakId = lagMockSakUuid("201", 2);
    const sakRef = getSaksreferanse(sakId);
    const resultat = loader({ params: { sakId: sakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(sakId);
    expect("personIdent" in resultat.sak).toBe(true);
  });

  it("setter status til VENTER_PA_VEDTAK og logger videresending ved gyldig innsending", async () => {
    const sakId = lagMockSakUuid("201", 2);
    const sakRef = getSaksreferanse(sakId);
    const sak = hentAlleSaker().find((eksisterendeSak) => eksisterendeSak.id === sakId);

    expect(sak?.status).toBe("UTREDES");

    const formData = new FormData();
    formData.set("mottaker", "nay");
    formData.append("valgteFiler", "fil-1");
    formData.set("funn", "Funn");
    formData.set("vurdering", "Vurdering");
    formData.set("anbefaling", "Anbefaling");

    const respons = await action({
      request: new Request(`http://localhost/saker/${sakRef}/videresend`, {
        method: "POST",
        body: formData,
      }),
      params: { sakId: sakRef },
    } as Route.ActionArgs);

    expect(sak?.status).toBe("UTREDES");
    expect(sak?.blokkert).toBe("VENTER_PA_VEDTAK");
    expect(respons).toBeInstanceOf(Response);
    expect((respons as Response).status).toBe(302);

    const historikk = hentHistorikk(sakId);
    expect(historikk[0]?.hendelsesType).toBe("VIDERESENDT_TIL_NAY_NFP");
    expect(historikk[0]?.status).toBe("UTREDES");
  });
});
