import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

const saksbehandlerNavn = [
  "Ada Larsen",
  "Aksel Johansen",
  "Alexander Haugen",
  "Amalie Olsen",
  "Andreas Berg",
  "Anne Kristiansen",
  "Arne Dahl",
  "Astrid Halvorsen",
  "Berit Solberg",
  "Bjørn Eriksen",
  "Camilla Arnesen",
  "Christian Moe",
  "Dag Henriksen",
  "Eli Bakken",
  "Erik Strand",
  "Eva Holmberg",
  "Frida Nilsen",
  "Geir Martinsen",
  "Grete Pedersen",
  "Hans Petter Lund",
  "Hege Svendsen",
  "Henrik Andersen",
  "Ida Thorsen",
  "Ingrid Aas",
  "Jan Ivar Holm",
  "Jonas Berntsen",
  "Julie Hauge",
  "Kari Nordmann",
  "Karl Fredrik Moen",
  "Katrine Vold",
  "Kristin Bjerke",
  "Lars Hansen",
  "Linda Fossheim",
  "Magne Sørensen",
  "Marit Nygård",
  "Martin Ruud",
  "Mette Johannessen",
  "Morten Knutsen",
  "Nina Hagen",
  "Nora Bjørnstad",
  "Ola Nordmann",
  "Ole Kristian Lie",
  "Pål Stensrud",
  "Per Arne Haugen",
  "Ragnhild Tangen",
  "Rune Brekke",
  "Saks Behandlersen",
  "Silje Ødegård",
  "Simen Åsberg",
  "Solveig Engen",
  "Stian Wold",
  "Terje Fjellstad",
  "Thomas Haugland",
  "Tonje Vikene",
  "Tor Magnus Lien",
  "Trond Gulbrandsen",
  "Turid Iversen",
  "Vegard Ness",
  "Vibeke Røed",
  "Vidar Skogen",
  "Wenche Brekken",
] as const;

const saksbehandlerEnheter = ["Nord", "Øst", "Vest", "Analyse"] as const;

const saksbehandlerOverstyringer: Partial<
  Record<(typeof saksbehandlerNavn)[number], KontrollsakSaksbehandler>
> = {
  "Kari Nordmann": {
    navn: "Kari Nordmann",
    navIdent: "Z123456",
    enhet: "Nord",
  },
  "Ada Larsen": {
    navn: "Ada Larsen",
    navIdent: "Z234567",
    enhet: "Øst",
  },
  "Saks Behandlersen": {
    navn: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "Nord",
  },
};

export const mockSaksbehandlerDetaljer: KontrollsakSaksbehandler[] = saksbehandlerNavn.map(
  (navn, indeks) =>
    saksbehandlerOverstyringer[navn] ?? {
      navn,
      navIdent: `Z${String(indeks + 300000).padStart(6, "0")}`,
      enhet: saksbehandlerEnheter[indeks % saksbehandlerEnheter.length],
    },
);

export const mockSaksbehandlere = mockSaksbehandlerDetaljer.map(
  (saksbehandler) => saksbehandler.navn,
);

export const mockSeksjoner = ["Nord", "Øst", "Vest", "Analyse"];
