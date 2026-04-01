import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { Route } from "./+types/VideresendSakSide.route";
import { loader } from "./VideresendSakSide.route";

describe("VideresendSakSide loader", () => {
  it("kan slå opp backend-shapet mine sak via lokal detalj-seam", () => {
    const sakId = lagMockSakUuid("201", 2);
    const resultat = loader({ params: { sakId } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(sakId);
    expect("personIdent" in resultat.sak).toBe(true);
  });
});
