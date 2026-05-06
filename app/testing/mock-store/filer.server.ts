import type { FilNode } from "~/saker/filer/typer";

const sharepointBase = "https://navno.sharepoint.com/sites/watson/saker";
const tommeFilområder = new Set<string>();

function lagUrl(sakId: string, sti: string): string {
  return `${sharepointBase}/${sakId}/${sti}`;
}

function lagFilstruktur(sakId: string): FilNode[] {
  return [
    {
      id: "1",
      type: "mappe",
      navn: "Dokumentasjon",
      sharepointUrl: lagUrl(sakId, "Dokumentasjon"),
      barn: [
        {
          id: "1-1",
          type: "fil",
          navn: "Saksframlegg.docx",
          format: "word",
          endretAv: "Ola Nordmann",
          endretDato: "2026-02-15",
          sharepointUrl: lagUrl(sakId, "Dokumentasjon/Saksframlegg.docx"),
        },
        {
          id: "1-2",
          type: "fil",
          navn: "Vedtak.pdf",
          format: "pdf",
          endretAv: "Kari Hansen",
          endretDato: "2026-02-20",
          sharepointUrl: lagUrl(sakId, "Dokumentasjon/Vedtak.pdf"),
        },
        {
          id: "1-3",
          type: "fil",
          navn: "Notat fra møte.docx",
          format: "word",
          endretAv: "Per Olsen",
          endretDato: "2026-03-01",
          sharepointUrl: lagUrl(sakId, "Dokumentasjon/Notat%20fra%20møte.docx"),
        },
      ],
    },
    {
      id: "2",
      type: "mappe",
      navn: "Bevismateriale",
      sharepointUrl: lagUrl(sakId, "Bevismateriale"),
      barn: [
        {
          id: "2-1",
          type: "fil",
          navn: "Oversikt ytelser.xlsx",
          format: "excel",
          endretAv: "Ola Nordmann",
          endretDato: "2026-01-10",
          sharepointUrl: lagUrl(sakId, "Bevismateriale/Oversikt%20ytelser.xlsx"),
        },
        {
          id: "2-2",
          type: "mappe",
          navn: "Skjermbilder",
          sharepointUrl: lagUrl(sakId, "Bevismateriale/Skjermbilder"),
          barn: [
            {
              id: "2-2-1",
              type: "fil",
              navn: "registrering-arena.png",
              format: "bilde",
              endretAv: "Kari Hansen",
              endretDato: "2026-01-12",
              sharepointUrl: lagUrl(sakId, "Bevismateriale/Skjermbilder/registrering-arena.png"),
            },
            {
              id: "2-2-2",
              type: "fil",
              navn: "utbetaling-oversikt.png",
              format: "bilde",
              endretAv: "Kari Hansen",
              endretDato: "2026-01-12",
              sharepointUrl: lagUrl(sakId, "Bevismateriale/Skjermbilder/utbetaling-oversikt.png"),
            },
          ],
        },
      ],
    },
    {
      id: "3",
      type: "fil",
      navn: "Presentasjon til ledelsen.pptx",
      format: "powerpoint",
      endretAv: "Per Olsen",
      endretDato: "2026-03-05",
      sharepointUrl: lagUrl(sakId, "Presentasjon%20til%20ledelsen.pptx"),
    },
    {
      id: "4",
      type: "fil",
      navn: "Sammendrag.pdf",
      format: "pdf",
      endretAv: "Ola Nordmann",
      endretDato: "2026-03-10",
      sharepointUrl: lagUrl(sakId, "Sammendrag.pdf"),
    },
  ];
}

export function hentFilerForSak(sakId: string): FilNode[] {
  if (tommeFilområder.has(sakId)) {
    return [];
  }

  const sisteTegn = sakId.at(-1) ?? "0";
  const harFiler = Number.parseInt(sisteTegn, 36) % 2 === 0;

  if (!harFiler) {
    return [];
  }

  return lagFilstruktur(sakId);
}

export function registrerTomtFilområdeForSak(sakId: string) {
  tommeFilområder.add(sakId);
}

export function resetMockFiler() {
  tommeFilområder.clear();
}
