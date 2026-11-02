import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  LinkBrokenIcon,
  LinkIcon,
  PersonGroupIcon,
} from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Box,
  Button,
  Detail,
  Heading,
  HGrid,
  HStack,
  Modal,
  Pagination,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { finnEnhetsnavn } from "~/kodeverk/enheter";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { AvkortetTag } from "~/komponenter/AvkortetTag";
import { RouteConfig } from "~/routeConfig";
import { hentAnmeldelseForVisning } from "~/saker/anmeldelse";
import { merkingEtikett } from "~/saker/kategorier";
import { getSaksreferanse } from "~/saker/id";
import {
  getBelop,
  getKategoriText,
  getMisbrukstyper,
  getSaksenhet,
  getTags,
} from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  formaterOrganisasjonsnummer,
  identEtikett,
  storFørsteBokstavPerOrd,
} from "~/utils/string-utils";
import { PersonIdentHistorikkModal } from "./PersonIdentHistorikkModal";
import { PersonIdentMedHistorikk } from "./PersonIdentMedHistorikk";
import {
  formaterBelop,
  getPersonIdent,
  getKildeText,
  formaterSteg,
  STEG_FARGE,
  hentStatusTag,
  getYtelseTyper,
  formaterYtelsePeriode,
} from "~/saker/visning";

interface SakerPåSammePersonProps {
  saker: KontrollsakResponse[];
  side?: number;
  totalSider?: number;
  gjeldendeSak: KontrollsakResponse;
  innloggetNavIdent: string;
}

interface SakKortProps {
  sak: KontrollsakResponse;
  erKoblet: boolean;
  kanEndreKobling: boolean;
  onEndreKobling: (sak: KontrollsakResponse, handling: Koblingshandling) => void;
  onVisIdentHistorikk: (sak: KontrollsakResponse) => void;
}

type Koblingshandling = "koble" | "fjerne";
type TekniskFeilSvar = { ok: false; feil: string; feilId: string; teknisk: true };
type KobleSakActionResult =
  | { ok: true }
  | { ok: false; feil: { skjema?: string[] } }
  | TekniskFeilSvar;

function SakDetaljfelt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-8">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      {children}
    </VStack>
  );
}

function SakPåSammePersonDetaljer({
  sak,
  onVisIdentHistorikk,
}: {
  sak: KontrollsakResponse;
  onVisIdentHistorikk: () => void;
}) {
  const kategori = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const merkinger = getTags(sak);
  const ytelseTyper = getYtelseTyper(sak);
  const belop = getBelop(sak);
  const personIdent = getPersonIdent(sak);
  const harHistoriskIdent = sak.historiskeIdenter.some((ident) => ident.historisk);
  const endeligeBeløp = sak.ytelser.flatMap((ytelse) =>
    ytelse.endeligBelop === null ? [] : [formaterBelop(ytelse.endeligBelop)],
  );
  const anmeldelse = hentAnmeldelseForVisning(sak);
  const perioder = [
    ...new Set(
      sak.ytelser
        .map((ytelse) => formaterYtelsePeriode(ytelse.periodeFra, ytelse.periodeTil))
        .filter((periode) => periode !== "–"),
    ),
  ];

  return (
    <VStack gap="space-24">
      <HGrid columns={{ xs: 1, lg: 2 }} gap="space-24">
        <VStack gap="space-24">
          <SakDetaljfelt label="Kategori">
            {kategori ? (
              <HStack align="start">
                <Tag
                  variant="moderate"
                  data-color="info"
                  size="small"
                  icon={<PersonGroupIcon aria-hidden />}
                >
                  {kategori}
                </Tag>
              </HStack>
            ) : (
              <BodyShort size="medium">–</BodyShort>
            )}
          </SakDetaljfelt>
          <SakDetaljfelt label="Misbruktype">
            {misbrukstyper.length > 0 ? (
              <HStack gap="space-8" wrap>
                {misbrukstyper.map((type) => (
                  <Tag key={type} variant="moderate" data-color="info" size="small">
                    {type}
                  </Tag>
                ))}
              </HStack>
            ) : (
              <BodyShort size="medium">–</BodyShort>
            )}
          </SakDetaljfelt>
          <SakDetaljfelt label="Merking">
            {merkinger.length > 0 ? (
              <HStack gap="space-8" wrap>
                {merkinger.map((merking) => (
                  <Tag key={merking} variant="moderate" data-color="info" size="small">
                    {merkingEtikett(merking)}
                  </Tag>
                ))}
              </HStack>
            ) : (
              <BodyShort size="medium">–</BodyShort>
            )}
          </SakDetaljfelt>
        </VStack>

        <VStack gap="space-24">
          <VStack gap="space-24">
            <SakDetaljfelt label="Periode">
              {perioder.length > 0 ? (
                <VStack gap="space-4">
                  {perioder.map((periode) => (
                    <BodyShort key={periode} size="medium">
                      {periode}
                    </BodyShort>
                  ))}
                </VStack>
              ) : (
                <BodyShort size="medium">–</BodyShort>
              )}
            </SakDetaljfelt>
            <SakDetaljfelt label="Ca beløp">
              <BodyShort size="medium">{belop === null ? "–" : formaterBelop(belop)}</BodyShort>
            </SakDetaljfelt>
          </VStack>
          <SakDetaljfelt label="Ytelse">
            {ytelseTyper.length > 0 ? (
              <HStack gap="space-8" wrap>
                {ytelseTyper.map((ytelse) => (
                  <Tag key={ytelse} variant="moderate" data-color="brand-beige" size="small">
                    {ytelse}
                  </Tag>
                ))}
              </HStack>
            ) : (
              <BodyShort size="medium">–</BodyShort>
            )}
          </SakDetaljfelt>
          <SakDetaljfelt label="Kilde">
            <BodyShort size="medium">{getKildeText(sak)}</BodyShort>
          </SakDetaljfelt>
        </VStack>
      </HGrid>

      <SakDetaljfelt label={identEtikett(sak.gjeldendePersonIdent ?? personIdent)}>
        <VStack gap="space-8" align="start">
          <PersonIdentMedHistorikk
            personIdent={sak.gjeldendePersonIdent ?? personIdent}
            harHistorikk={harHistoriskIdent}
            onVisHistorikk={onVisIdentHistorikk}
          />
          {sak.gjeldendePersonIdent && sak.gjeldendePersonIdent !== sak.personIdent && (
            <Detail>Saken ble opprettet under {personIdent}</Detail>
          )}
        </VStack>
      </SakDetaljfelt>

      {(sak.legacyPid ||
        sak.arbeidsgivere.length > 0 ||
        endeligeBeløp.length > 0 ||
        anmeldelse) && (
        <HGrid columns={{ xs: 1, lg: 2 }} gap="space-24">
          {sak.legacyPid && (
            <SakDetaljfelt label="PID">
              <BodyShort size="medium">{sak.legacyPid}</BodyShort>
            </SakDetaljfelt>
          )}
          {sak.arbeidsgivere.length > 0 && (
            <SakDetaljfelt label="Organisasjonsnummer">
              <BodyShort size="medium">
                {sak.arbeidsgivere
                  .map((organisasjonsnummer) => formaterOrganisasjonsnummer(organisasjonsnummer))
                  .join(", ")}
              </BodyShort>
            </SakDetaljfelt>
          )}
          {endeligeBeløp.length > 0 && (
            <SakDetaljfelt label="Endelig beløp">
              <BodyShort size="medium">{endeligeBeløp.join(", ")}</BodyShort>
            </SakDetaljfelt>
          )}
          {anmeldelse && (
            <>
              <SakDetaljfelt label="Anmeldt beløp">
                <BodyShort size="medium">{formaterBelop(anmeldelse.anmeldtBelop)}</BodyShort>
              </SakDetaljfelt>
              <SakDetaljfelt label="Politidistrikt">
                <BodyShort size="medium">{anmeldelse.politidistrikt ?? "Ikke oppgitt"}</BodyShort>
              </SakDetaljfelt>
            </>
          )}
        </HGrid>
      )}
    </VStack>
  );
}

function SakKort({
  sak,
  erKoblet,
  kanEndreKobling,
  onEndreKobling,
  onVisIdentHistorikk,
}: SakKortProps) {
  const [åpen, setÅpen] = useState(false);
  const detaljerId = useId();
  const kodeverk = useKodeverk();
  const saksreferanse = getSaksreferanse(sak.id);
  const statusTag = hentStatusTag(sak);
  const enhetskode = getSaksenhet(sak);
  const enhet = enhetskode ? finnEnhetsnavn(kodeverk.enheter, enhetskode) : "Ukjent";
  const saksbehandler = sak.saksbehandlere.eier?.navn ?? sak.saksbehandlere.opprettetAv.navn;

  return (
    <Box
      borderWidth="1"
      borderColor="neutral-subtle"
      borderRadius="8"
      background="default"
      overflow="hidden"
    >
      <VStack gap="space-0">
        <Box
          background="neutral-soft"
          borderWidth="0 0 1 0"
          borderColor="neutral-subtle"
          paddingBlock="space-12"
          paddingInline="space-20"
        >
          <HStack justify="space-between" align="center" wrap gap="space-12">
            <HStack gap="space-24" align="center" wrap>
              <BodyShort size="small">
                Saksid: <strong>{saksreferanse}</strong>
              </BodyShort>
              <BodyShort size="small">
                Enhet: <strong>{enhet}</strong>
              </BodyShort>
              <BodyShort size="small">
                Saksbehandler: <strong>{storFørsteBokstavPerOrd(saksbehandler)}</strong>
              </BodyShort>
              {sak.steg === "AVSLUTTET" ? (
                <AvkortetTag variant="moderate" data-color={statusTag.farge} size="small">
                  {statusTag.tekst}
                </AvkortetTag>
              ) : (
                <AvkortetTag variant="moderate" data-color={STEG_FARGE} size="small">
                  {formaterSteg(sak.steg)}
                </AvkortetTag>
              )}
            </HStack>
            <HStack gap="space-8" align="center">
              <Button
                as={Link}
                to={RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse)}
                variant="secondary"
                size="small"
                icon={<ExternalLinkIcon aria-hidden />}
              >
                Gå til sak
              </Button>
              <Button
                type="button"
                variant="tertiary"
                size="small"
                icon={åpen ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
                aria-label={`${åpen ? "Skjul" : "Vis"} detaljer for sak ${saksreferanse}`}
                aria-expanded={åpen}
                aria-controls={detaljerId}
                onClick={() => setÅpen((prev) => !prev)}
              />
            </HStack>
          </HStack>
        </Box>

        {åpen && (
          <Box id={detaljerId} padding="space-20">
            <VStack gap="space-24">
              <SakPåSammePersonDetaljer
                sak={sak}
                onVisIdentHistorikk={() => onVisIdentHistorikk(sak)}
              />
              {kanEndreKobling && (
                <HStack justify="end">
                  <Button
                    type="button"
                    variant={erKoblet ? "tertiary-neutral" : "secondary"}
                    size="small"
                    icon={erKoblet ? <LinkBrokenIcon aria-hidden /> : <LinkIcon aria-hidden />}
                    iconPosition="right"
                    onClick={() => onEndreKobling(sak, erKoblet ? "fjerne" : "koble")}
                  >
                    {erKoblet ? "Fjern kobling" : "Koble til sak"}
                  </Button>
                </HStack>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

export function SakerPåSammePerson({
  saker,
  side = 1,
  totalSider = 0,
  gjeldendeSak,
  innloggetNavIdent,
}: SakerPåSammePersonProps) {
  const [valgtSak, setValgtSak] = useState<KontrollsakResponse | null>(null);
  const [sakMedIdentHistorikk, setSakMedIdentHistorikk] = useState<KontrollsakResponse | null>(
    null,
  );
  const [handling, setHandling] = useState<Koblingshandling>("koble");
  const [feilmelding, setFeilmelding] = useState<string>();
  const harSendt = useRef(false);
  const fetcher = useFetcher<KobleSakActionResult>();
  const [searchParams, setSearchParams] = useSearchParams();
  const andreSaker = saker.filter((sak) => sak.id !== gjeldendeSak.id);
  const erKoblingsmodalÅpen = valgtSak !== null;
  const erFrakobling = handling === "fjerne";

  useEffect(() => {
    if (!harSendt.current || fetcher.state !== "idle") return;

    harSendt.current = false;
    if (fetcher.data?.ok) {
      setValgtSak(null);
      return;
    }
    if (erTekniskFeilSvar(fetcher.data)) return;
    setFeilmelding(fetcher.data?.feil.skjema?.[0] ?? "Kunne ikke endre koblingen. Prøv igjen.");
  }, [fetcher.data, fetcher.state]);

  if (andreSaker.length === 0 && totalSider <= 1) {
    return null;
  }

  function gåTilSide(ny: number) {
    const neste = new URLSearchParams(searchParams);
    if (ny <= 1) {
      neste.delete("relaterteSaker");
    } else {
      neste.set("relaterteSaker", String(ny));
    }
    setSearchParams(neste, { preventScrollReset: true });
  }

  function åpneKoblingsmodal(sak: KontrollsakResponse, nyHandling: Koblingshandling) {
    setValgtSak(sak);
    setHandling(nyHandling);
    setFeilmelding(undefined);
  }

  function lukkKoblingsmodal() {
    if (fetcher.state === "idle") {
      setValgtSak(null);
    }
  }

  function sendKobling() {
    harSendt.current = true;
  }

  const gjeldendeSaksreferanse = getSaksreferanse(gjeldendeSak.id);
  const valgtSaksreferanse = valgtSak ? getSaksreferanse(valgtSak.id) : "";
  const valgtKategori = valgtSak ? getKategoriText(valgtSak) : null;

  return (
    <>
      <Box borderWidth="1" borderColor="neutral-subtle" borderRadius="8" background="raised">
        <VStack gap="space-8">
          <Box padding="space-16">
            <Heading level="2" size="small">
              Saker på samme person
            </Heading>
          </Box>
          <VStack gap="space-8">
            {andreSaker.map((sak) => (
              <SakKort
                key={sak.id}
                sak={sak}
                erKoblet={gjeldendeSak.kobledeSaker.includes(sak.id)}
                kanEndreKobling={
                  erSaksbehandlerPåSak(gjeldendeSak, innloggetNavIdent) ||
                  erSaksbehandlerPåSak(sak, innloggetNavIdent)
                }
                onEndreKobling={åpneKoblingsmodal}
                onVisIdentHistorikk={setSakMedIdentHistorikk}
              />
            ))}
          </VStack>
          {totalSider > 1 && (
            <HStack justify="end">
              <Pagination page={side} onPageChange={gåTilSide} count={totalSider} size="small" />
            </HStack>
          )}
        </VStack>
      </Box>

      <Modal
        open={erKoblingsmodalÅpen}
        onClose={lukkKoblingsmodal}
        header={{ heading: erFrakobling ? "Fjern kobling" : "Koble til sak" }}
        width="small"
      >
        <fetcher.Form method="post" onSubmit={sendKobling}>
          <Modal.Body>
            <VStack gap="space-16">
              {erFrakobling ? (
                <BodyShort>
                  Vil du fjerne koblingen mellom sak {gjeldendeSaksreferanse} og sak{" "}
                  {valgtSaksreferanse}?
                </BodyShort>
              ) : (
                <BodyShort>
                  Vil du koble sak {gjeldendeSaksreferanse} til sak {valgtSaksreferanse}
                  {valgtKategori ? ` ${valgtKategori}` : ""}?
                </BodyShort>
              )}

              {feilmelding && <Alert variant="error">{feilmelding}</Alert>}
              <Innsendingsfeil svar={fetcher.data} />
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <input
              type="hidden"
              name="handling"
              value={erFrakobling ? "fjern_kobling" : "koble_sak"}
            />
            <input type="hidden" name="relatertSakId" value={valgtSak?.id ?? ""} />
            <Button
              type="submit"
              variant={erFrakobling ? "danger" : "primary"}
              loading={fetcher.state !== "idle"}
            >
              {erFrakobling ? "Fjern kobling" : "Koble til sak"}
            </Button>
            <Button type="button" variant="secondary" onClick={lukkKoblingsmodal}>
              Avbryt
            </Button>
          </Modal.Footer>
        </fetcher.Form>
      </Modal>
      {sakMedIdentHistorikk && (
        <PersonIdentHistorikkModal
          sak={sakMedIdentHistorikk}
          åpen={true}
          onClose={() => setSakMedIdentHistorikk(null)}
        />
      )}
    </>
  );
}

function erSaksbehandlerPåSak(sak: KontrollsakResponse, navIdent: string): boolean {
  return (
    sak.saksbehandlere.eier?.navIdent === navIdent ||
    sak.saksbehandlere.deltMed.some((saksbehandler) => saksbehandler.navIdent === navIdent)
  );
}
