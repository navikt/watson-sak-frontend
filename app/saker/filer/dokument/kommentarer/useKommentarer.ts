import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  kommentarlisteKlientSchema,
  kommentartraadKlientSchema,
  tilBackendAnker,
  type Anker,
  type Kommentar,
  type Kommentarliste,
  type Kommentartraad,
} from "./typer";

/**
 * Klientsiden av kommentar-CRUD.
 *
 * Alle kall går mot BFF-ruta, aldri direkte mot backend. Kroppene speiler
 * backendkontrakten eksakt: svar sender `traadVersjon`, redigering/sletting
 * sender kommentarens `versjon`, og adressering sender trådens `versjon`.
 *
 * Ved 409 beholder vi brukerens utkast og **henter kommentarlisten på nytt**,
 * fordi backendens ProblemDetail ikke inneholder den ferske tråden. Da får
 * saksbehandleren se hva som faktisk står der før hun prøver igjen.
 */

export type MutasjonResultat =
  | { ok: true; traad: Kommentartraad }
  | { ok: false; melding: string; konflikt: boolean };

type Handling =
  | {
      handling: "opprett_traad";
      traadId: string;
      kommentarId: string;
      ankerType: string;
      anker: Record<string, unknown>;
      opprinneligSitat: string | null;
      tekst: string;
    }
  | {
      handling: "opprett_kommentar";
      traadId: string;
      kommentarId: string;
      tekst: string;
      traadVersjon: number;
    }
  | { handling: "rediger_kommentar"; kommentarId: string; tekst: string; versjon: number }
  | { handling: "slett_kommentar"; kommentarId: string; versjon: number }
  | { handling: "sett_adressering"; traadId: string; adressert: boolean; versjon: number };

const GENERELL_FEIL = "Kunne ikke lagre kommentaren. Prøv igjen.";
const KONFLIKT_FEIL =
  "Kommentaren er endret av noen andre. Se den oppdaterte teksten før du lagrer.";

function lesTraad(verdi: unknown): Kommentartraad | null {
  const resultat = kommentartraadKlientSchema.safeParse(verdi);
  return resultat.success ? resultat.data : null;
}

export function useKommentarer({ url, startListe }: { url: string; startListe: Kommentarliste }) {
  const [traader, settTraader] = useState<Kommentartraad[]>(startListe.traader);
  const [kanKommentere, settKanKommentere] = useState(startListe.kanKommentere);
  const [sender, settSender] = useState(false);

  // Loaderen revalideres ved lagring/gjenoppretting av dokumentet. Da skal panelet
  // følge med. Vi sammenligner på innhold, ikke referanse: loaderdata kan komme som
  // et nytt objekt med identisk innhold, og da skal vi ikke nullstille panelet.
  const startNøkkel = useMemo(() => JSON.stringify(startListe), [startListe]);
  const startRef = useRef(startListe);
  startRef.current = startListe;
  useEffect(() => {
    settTraader(startRef.current.traader);
    settKanKommentere(startRef.current.kanKommentere);
  }, [startNøkkel]);

  /** Henter hele lista på nytt. Brukes etter 409 så brukeren ser gjeldende tilstand. */
  const oppdaterFraServer = useCallback(async () => {
    try {
      const respons = await fetch(url, { headers: { Accept: "application/json" } });
      if (!respons.ok) return;
      const parset = kommentarlisteKlientSchema.safeParse(await respons.json());
      if (!parset.success) return;
      settTraader(parset.data.traader);
      settKanKommentere(parset.data.kanKommentere);
    } catch {
      // Klarer vi ikke å oppdatere, står panelet igjen med det vi hadde.
    }
  }, [url]);

  const oppdaterTraad = useCallback((traad: Kommentartraad) => {
    settTraader((gjeldende) => {
      // En tråd uten synlige kommentarer skal ut av lista, akkurat som i GET.
      if (!traad.synlig) return gjeldende.filter((kandidat) => kandidat.id !== traad.id);
      const finnes = gjeldende.some((kandidat) => kandidat.id === traad.id);
      return finnes
        ? gjeldende.map((kandidat) => (kandidat.id === traad.id ? traad : kandidat))
        : [...gjeldende, traad];
    });
  }, []);

  const utfør = useCallback(
    async (kropp: Handling): Promise<MutasjonResultat> => {
      settSender(true);
      try {
        const respons = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kropp),
        });

        if (respons.status === 409) {
          const kropp409 = (await respons.json().catch(() => null)) as { melding?: string } | null;
          // ProblemDetail har ingen fersk tråd – hent lista på nytt.
          await oppdaterFraServer();
          return { ok: false, konflikt: true, melding: kropp409?.melding ?? KONFLIKT_FEIL };
        }

        if (!respons.ok) {
          const melding = await respons.text().catch(() => "");
          return { ok: false, konflikt: false, melding: melding.trim() || GENERELL_FEIL };
        }

        const svar = (await respons.json()) as { traad?: unknown };
        const oppdatert = lesTraad(svar.traad);
        if (!oppdatert) {
          return { ok: false, konflikt: false, melding: GENERELL_FEIL };
        }
        oppdaterTraad(oppdatert);
        return { ok: true, traad: oppdatert };
      } catch {
        return { ok: false, konflikt: false, melding: GENERELL_FEIL };
      } finally {
        settSender(false);
      }
    },
    [oppdaterFraServer, oppdaterTraad, url],
  );

  const opprettTraad = useCallback(
    (data: {
      anker: Anker;
      opprinneligSitat?: string | null;
      tekst: string;
    }): Promise<MutasjonResultat> => {
      const { ankerType, anker } = tilBackendAnker(data.anker);
      return utfør({
        handling: "opprett_traad",
        traadId: crypto.randomUUID(),
        kommentarId: crypto.randomUUID(),
        ankerType,
        anker,
        opprinneligSitat: data.opprinneligSitat ?? null,
        tekst: data.tekst,
      });
    },
    [utfør],
  );

  const svar = useCallback(
    (traad: Kommentartraad, tekst: string): Promise<MutasjonResultat> =>
      utfør({
        handling: "opprett_kommentar",
        traadId: traad.id,
        kommentarId: crypto.randomUUID(),
        tekst,
        traadVersjon: traad.versjon,
      }),
    [utfør],
  );

  const rediger = useCallback(
    (kommentar: Kommentar, tekst: string): Promise<MutasjonResultat> =>
      utfør({
        handling: "rediger_kommentar",
        kommentarId: kommentar.id,
        tekst,
        versjon: kommentar.versjon,
      }),
    [utfør],
  );

  const slett = useCallback(
    (kommentar: Kommentar): Promise<MutasjonResultat> =>
      utfør({
        handling: "slett_kommentar",
        kommentarId: kommentar.id,
        versjon: kommentar.versjon,
      }),
    [utfør],
  );

  const settAdressering = useCallback(
    (traad: Kommentartraad, adressert: boolean): Promise<MutasjonResultat> =>
      utfør({
        handling: "sett_adressering",
        traadId: traad.id,
        adressert,
        versjon: traad.versjon,
      }),
    [utfør],
  );

  return {
    traader,
    kanKommentere,
    sender,
    opprettTraad,
    svar,
    rediger,
    slett,
    settAdressering,
  };
}

export type KommentarHandlinger = Pick<
  ReturnType<typeof useKommentarer>,
  "opprettTraad" | "svar" | "rediger" | "slett" | "settAdressering"
>;
