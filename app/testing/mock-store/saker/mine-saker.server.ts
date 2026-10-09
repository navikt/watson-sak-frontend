import { kontrollsakResponseSchema } from "~/saker/types.backend";
import { normaliserLegacyKontrollsak } from "~/saker/mock-uuid";
import { berikLegacySakMedPerson, hentMockPersonNavn } from "~/testing/mock-store/personer.server";
import {
  backendGenererteDemoSaker,
  initialeMockMineKontrollsaker,
  innloggetEier,
  mockMineSakerInnloggetNavIdent,
} from "~/testing/mock-store/saker/mine-saker.fixtures.server";

export { innloggetEier, mockMineSakerInnloggetNavIdent };

function lagMockMineKontrollsaker() {
  const legacySaker = initialeMockMineKontrollsaker.map((sak) =>
    kontrollsakResponseSchema.parse(normaliserLegacyKontrollsak(berikLegacySakMedPerson(sak))),
  );

  const nyeSaker = backendGenererteDemoSaker.map((sak) =>
    kontrollsakResponseSchema.parse({
      ...sak,
      personNavn: hentMockPersonNavn(sak.personIdent),
      // Alle saker skal ha en enhet. Disse testdataene setter den bare via
      // saksbehandlerens enhet, så bruk den som fallback for sakens egen enhet.
      enhet: sak.saksbehandlere.ansvarlig?.enhet ?? null,
    }),
  );

  return [...legacySaker, ...nyeSaker];
}

/** Factory som brukes av session.server.ts for å bygge initial tilstand */
export const lagInitialMineKontrollsaker = lagMockMineKontrollsaker;
