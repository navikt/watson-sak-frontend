import { CheckmarkCircleFillIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HGrid, Modal, VStack } from "@navikt/ds-react";
import { Link } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { formaterBelop } from "~/saker/visning";
import type { Kodeverk } from "~/saker/api.server";
import { parseYtelseRader } from "./skjema-helpers";

type YtelseSammendrag = {
  label: string;
  periode: string;
  beløp?: string;
};

export type OpprettSakSammendrag = {
  kategoriLabel: string;
  kildeLabel: string;
  enhetLabel: string;
  misbrukstypeLabels: string[];
  orgnumre: string[];
  ytelser: YtelseSammendrag[];
};

function lesTekst(formData: FormData, navn: string): string {
  const verdi = formData.get(navn);
  return typeof verdi === "string" ? verdi : "";
}

function finnBeskrivelse(kodeverk: Kodeverk["kilder"], kode: string): string {
  return kodeverk.find((k) => k.kode === kode)?.beskrivelse ?? kode;
}

function formaterPeriode(fraDato?: string, tilDato?: string): string {
  if (fraDato && tilDato) return `${fraDato}–${tilDato}`;
  if (fraDato) return `Fra ${fraDato}`;
  if (tilDato) return `Til ${tilDato}`;
  return "";
}

/**
 * Bygger sammendraget som vises i bekreftelsesmodalen, basert på det samme
 * FormData-objektet som faktisk sendes til serveren. Dette sikrer at
 * sammendraget alltid stemmer overens med det som opprettes — uavhengig av om
 * enkeltfelter er kontrollerte React-states eller ukontrollerte skjemafelt.
 */
export function byggOpprettSakSammendrag(
  formData: FormData,
  kodeverk: Kodeverk,
  ytelseLabelMap: Map<string, string>,
  misbrukstypeLabelMap: Map<string, string>,
): OpprettSakSammendrag {
  const kategoriKode = lesTekst(formData, "kategori");
  const kildeKode = lesTekst(formData, "kilde");
  const enhetKode = lesTekst(formData, "enhet");

  const misbrukstypeLabels = formData
    .getAll("misbruktype")
    .map((verdi) => misbrukstypeLabelMap.get(String(verdi)) ?? String(verdi));

  const orgnumre = formData.getAll("arbeidsgivere").map(String);

  const ytelser = parseYtelseRader(formData)
    .filter((rad) => rad.type)
    .map((rad) => ({
      label: ytelseLabelMap.get(rad.type as string) ?? (rad.type as string),
      periode: formaterPeriode(rad.fraDato, rad.tilDato),
      beløp: rad.beløp ? `${formaterBelop(Number(rad.beløp))} kr` : undefined,
    }));

  return {
    kategoriLabel: finnBeskrivelse(kodeverk.kategorier, kategoriKode),
    kildeLabel: finnBeskrivelse(kodeverk.kilder, kildeKode),
    enhetLabel: finnBeskrivelse(kodeverk.enheter, enhetKode),
    misbrukstypeLabels,
    orgnumre,
    ytelser,
  };
}

function SammendragRad({ label, verdi }: { label: string; verdi: React.ReactNode }) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      <BodyShort size="small">{verdi}</BodyShort>
    </>
  );
}

type OpprettSakBekreftelseModalProps = {
  steg: "bekreft" | "suksess";
  åpen: boolean;
  onClose: () => void;
  personNavn: string;
  personnummer: string;
  alder: number;
  sammendrag: OpprettSakSammendrag | null;
  senderInn: boolean;
  onBekreft: () => void;
  onAvbryt: () => void;
  sakId: string | null;
  onOpprettNySak: () => void;
};

export function OpprettSakBekreftelseModal({
  steg,
  åpen,
  onClose,
  personNavn,
  personnummer,
  alder,
  sammendrag,
  senderInn,
  onBekreft,
  onAvbryt,
  sakId,
  onOpprettNySak,
}: OpprettSakBekreftelseModalProps) {
  return (
    <Modal
      open={åpen}
      onClose={onClose}
      width="small"
      header={steg === "bekreft" ? { heading: "Opprett sak" } : undefined}
      aria-label={steg === "bekreft" ? "Opprett sak" : "Sak opprettet"}
    >
      {steg === "suksess" && <Modal.Header />}
      <Modal.Body>
        {steg === "bekreft" && sammendrag && (
          <VStack gap="space-16">
            <BodyShort>Se over at informasjonen stemmer før saken opprettes:</BodyShort>
            <div className="rounded-md bg-ax-bg-neutral-soft px-5 py-4">
              <HGrid columns="auto 1fr" gap="space-4 space-16">
                <SammendragRad label="Person" verdi={`${personNavn} (${alder})`} />
                <SammendragRad label="Personnummer" verdi={personnummer} />
                <SammendragRad label="Enhet" verdi={sammendrag.enhetLabel} />
                {sammendrag.orgnumre.length > 0 && (
                  <SammendragRad label="Orgnr" verdi={sammendrag.orgnumre.join(", ")} />
                )}
                <SammendragRad label="Kilde" verdi={sammendrag.kildeLabel} />
                <SammendragRad label="Kategori" verdi={sammendrag.kategoriLabel} />
                {sammendrag.misbrukstypeLabels.length > 0 && (
                  <SammendragRad
                    label="Misbrukstype"
                    verdi={sammendrag.misbrukstypeLabels.join(", ")}
                  />
                )}
                {sammendrag.ytelser.length > 0 && (
                  <SammendragRad
                    label="Ytelser"
                    verdi={
                      <VStack gap="space-0">
                        {sammendrag.ytelser.map((ytelse, indeks) => (
                          <span key={indeks}>
                            {ytelse.label}
                            {ytelse.periode ? ` — ${ytelse.periode}` : ""}
                            {ytelse.beløp ? `, antatt beløp ${ytelse.beløp}` : ""}
                          </span>
                        ))}
                      </VStack>
                    }
                  />
                )}
              </HGrid>
            </div>
          </VStack>
        )}

        {steg === "suksess" && (
          <VStack gap="space-16" align="center" className="py-6 text-center">
            <CheckmarkCircleFillIcon
              aria-hidden
              fontSize="3rem"
              className="text-ax-bg-success-strong"
            />
            <VStack gap="space-4" align="center">
              <BodyShort weight="semibold">Sak opprettet</BodyShort>
              <BodyShort textColor="subtle">
                Saken er opprettet på {personNavn}. Saksnummer {sakId}. Du finner den under Alle
                saker.
              </BodyShort>
            </VStack>
          </VStack>
        )}
      </Modal.Body>
      <Modal.Footer>
        {steg === "bekreft" && (
          <>
            <Button variant="secondary" onClick={onAvbryt} disabled={senderInn}>
              Avbryt
            </Button>
            <Button variant="primary" onClick={onBekreft} loading={senderInn} disabled={senderInn}>
              Opprett sak
            </Button>
          </>
        )}
        {steg === "suksess" && sakId && (
          <>
            <Button variant="secondary" onClick={onOpprettNySak}>
              Opprett ny sak
            </Button>
            <Button
              as={Link}
              to={RouteConfig.SAKER_DETALJ.replace(":sakId", sakId)}
              variant="primary"
            >
              Gå til saken
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
