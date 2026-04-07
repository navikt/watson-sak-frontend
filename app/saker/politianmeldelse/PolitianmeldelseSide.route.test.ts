import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { Route } from "./+types/PolitianmeldelseSide.route";
import { loader } from "./PolitianmeldelseSide.route";

describe("PolitianmeldelseSide loader", () => {
  it("kan slå opp backend-shapet mine sak via lokal detalj-seam", () => {
    const sakId = lagMockSakUuid("201", 2);
    const sakRef = getSaksreferanse(sakId);
    const resultat = loader({ params: { sakId: sakRef } } as Route.LoaderArgs);

    expect(resultat.sak.id).toBe(sakId);
    expect("personIdent" in resultat.sak).toBe(true);
  });
});
