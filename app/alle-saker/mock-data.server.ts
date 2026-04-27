// Mock-data for Alle saker-siden.
// Nøkkeltall er statisk inntil backend-integrasjon er på plass.

type Nokkeltall = {
  pagaendeSaker: number;
  paVent: number;
  utredetInnen12Uker: number;
  utredetInnen15Uker: number;
  gjennomsnittligSaksbehandlingstid: number;
};

export const mockNokkeltall: Nokkeltall = {
  pagaendeSaker: 38,
  paVent: 4,
  utredetInnen12Uker: 78,
  utredetInnen15Uker: 95,
  gjennomsnittligSaksbehandlingstid: 8,
};
