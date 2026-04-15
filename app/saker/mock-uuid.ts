import type { KontrollsakResponse } from "./types.backend";

function hentSaknummer(fixtureId: string): bigint {
  const siffer = fixtureId.replace(/\D/g, "");

  if (!siffer) {
    throw new Error(`Kunne ikke utlede saksnummer fra fixture-id ${fixtureId}`);
  }

  return BigInt(siffer);
}

function lagMockUuid(verdi: bigint | number): string {
  return `00000000-0000-4000-8000-${String(verdi).padStart(12, "0")}`;
}

function lagEntityBase(fixtureId: string, namespace: number): bigint {
  return BigInt(namespace) * 1_000_000n + hentSaknummer(fixtureId) * 1_000n;
}

export function lagMockSakUuid(fixtureId: string, namespace: number): string {
  return lagMockUuid(lagEntityBase(fixtureId, namespace));
}

export function lagMockKontrollsak(
  sak: KontrollsakResponse,
  namespace: number,
): KontrollsakResponse {
  const entityBase = lagEntityBase(sak.id, namespace);

  return {
    ...sak,
    id: lagMockUuid(entityBase),
    saksbehandlere: {
      ...sak.saksbehandlere,
      eier: sak.saksbehandlere.eier
        ? {
            ...sak.saksbehandlere.eier,
          }
        : null,
      deltMed: sak.saksbehandlere.deltMed.map((saksbehandler) => ({
        ...saksbehandler,
      })),
      opprettetAv: {
        ...sak.saksbehandlere.opprettetAv,
      },
    },
    ytelser: sak.ytelser.map((ytelse, indeks) => ({
      ...ytelse,
      id: lagMockUuid(entityBase + 100n + BigInt(indeks + 1)),
    })),
    resultat: sak.resultat
      ? {
          ...sak.resultat,
          utredning: sak.resultat.utredning
            ? {
                ...sak.resultat.utredning,
                id: lagMockUuid(entityBase + 500n),
              }
            : null,
          forvaltning: sak.resultat.forvaltning
            ? {
                ...sak.resultat.forvaltning,
                id: lagMockUuid(entityBase + 600n),
              }
            : null,
          strafferettsligVurdering: sak.resultat.strafferettsligVurdering
            ? {
                ...sak.resultat.strafferettsligVurdering,
                id: lagMockUuid(entityBase + 700n),
              }
            : null,
        }
      : null,
  };
}
