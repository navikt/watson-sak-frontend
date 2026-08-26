import { LinkIcon, TrashIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Loader, Tooltip } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterStorrelse } from "~/utils/number-utils";
import { FilIBrukModal } from "./FilIBrukModal";
import { filTypeIkon, filTypeTekst } from "./fil-type-utils";
import { FilerRad, FilerSeksjonCaption } from "./FilerRad";
import { ÅpneFilKnapp, formaterDato } from "./fil-visning-utils";
import { SlettFilModal } from "./SlettFilModal";
import type { DokumentReferanse, FilResponse } from "./typer";

interface SlettKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
  bruktIDokumenter: DokumentReferanse[];
}

function SlettKnapp({ filId, filnavn, sakId, bruktIDokumenter }: SlettKnappProps) {
  const fetcher = useFetcher<{ ok: boolean; dokumenter?: DokumentReferanse[] }>();
  const [dokumenterIBruk, settDokumenterIBruk] = useState<DokumentReferanse[] | null>(null);
  const [slettekandidat, settSlettekandidat] = useState<string | null>(null);
  const sletter = fetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  // Backend kan avvise sletting (409) selv om filen ikke var kjent som «i bruk»
  // ved sidelasting (f.eks. hvis den ble satt inn i et dokument like før forsøket).
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok === false && fetcher.data.dokumenter) {
      settDokumenterIBruk(fetcher.data.dokumenter);
    }
  }, [fetcher.state, fetcher.data]);

  function håndterKlikk(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (bruktIDokumenter.length > 0) {
      settDokumenterIBruk(bruktIDokumenter);
      return;
    }
    settSlettekandidat(filnavn);
  }

  function bekreftSletting() {
    settSlettekandidat(null);
    sporHendelse("vedlegg slettet", { sakId });
    fetcher.submit(null, { method: "delete", action: url });
  }

  return (
    <>
      <fetcher.Form method="delete" action={url}>
        <Button
          type="submit"
          variant="tertiary-neutral"
          size="xsmall"
          icon={sletter ? <Loader size="xsmall" aria-hidden /> : <TrashIcon aria-hidden />}
          disabled={sletter}
          aria-label={`Slett ${filnavn}`}
          onClick={håndterKlikk}
        />
      </fetcher.Form>
      <FilIBrukModal
        dokumenter={dokumenterIBruk}
        filnavn={filnavn}
        sakId={sakId}
        onClose={() => settDokumenterIBruk(null)}
      />
      {slettekandidat !== null && (
        <SlettFilModal
          kandidat={slettekandidat}
          sletter={sletter}
          onBekreft={bekreftSletting}
          onAvbryt={() => settSlettekandidat(null)}
        />
      )}
    </>
  );
}

interface VedleggSeksjonProps {
  filer: FilResponse[];
  sakId: string;
  erSakseier: boolean;
  /** Om en opplasting pågår (styrt av `SakFilområde`, som eier «Last opp fil»-knappen). */
  lasterOpp?: boolean;
  /** Feilmelding fra en mislykket opplasting (styrt av `SakFilområde`). */
  feilFraServer?: string | null;
}

/** Viser filer lastet opp utenfra saken. Forventer at `filer` allerede er filtrert til
 * ikke-arkiverte filer av kalleren (`SakFilområde`) — arkiverte filer vises kun i
 * Arkivert-seksjonen. Selve opplastingen (knapp og filvelger) eies av `SakFilområde`s felles
 * header for «Filer». */
export function VedleggSeksjon({
  filer,
  sakId,
  erSakseier,
  lasterOpp = false,
  feilFraServer = null,
}: VedleggSeksjonProps) {
  return (
    <div>
      <FilerSeksjonCaption
        tittel="Opplastede filer"
        undertekst="Lastet opp utenfra – kan ikke redigeres"
      />

      {feilFraServer && (
        <Alert variant="error" size="small">
          {feilFraServer}
        </Alert>
      )}

      {filer.length === 0 && !lasterOpp ? (
        <BodyShort size="small" className="py-2 text-ax-text-neutral-subtle">
          Ingen opplastede filer ennå
        </BodyShort>
      ) : (
        <ul className="flex flex-col" aria-label="Opplastede filer">
          {filer.map((fil) => (
            <FilerRad
              key={fil.id}
              type="fil"
              ikon={filTypeIkon(fil.contentType)}
              tittel={fil.filnavn}
              tag={
                fil.bruktIDokumenter.length > 0 && (
                  <Tooltip
                    content={`I bruk i: ${fil.bruktIDokumenter.map((d) => d.tittel || "Uten tittel").join(", ")}`}
                  >
                    <LinkIcon
                      aria-label={`Filen er i bruk i ${fil.bruktIDokumenter.length} dokument(er)`}
                      className="text-ax-text-neutral-subtle"
                    />
                  </Tooltip>
                )
              }
              metadata={`${filTypeTekst(fil.contentType)} · ${formaterStorrelse(fil.storrelse)} · Lastet opp ${formaterDato(fil.opprettet)} · ${fil.opprettetAv}`}
              handlinger={
                <>
                  <ÅpneFilKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
                  {erSakseier && (
                    <SlettKnapp
                      filId={fil.id}
                      filnavn={fil.filnavn}
                      sakId={sakId}
                      bruktIDokumenter={fil.bruktIDokumenter}
                    />
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}
      {lasterOpp && (
        <div className="flex items-center gap-2 pt-2 text-ax-text-neutral-subtle">
          <Loader size="xsmall" aria-hidden />
          <span>Laster opp …</span>
        </div>
      )}
    </div>
  );
}
