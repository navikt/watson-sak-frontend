import { ChevronDownIcon, ChevronUpIcon, LinkBrokenIcon, LinkIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Box,
  Button,
  Detail,
  Heading,
  HGrid,
  HStack,
  LocalAlert,
  Modal,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import {
  getBelop,
  getKategoriText,
  getMisbrukstyper,
  getPeriodeText,
  getTags,
} from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { PersonIdentHistorikkModal } from "./PersonIdentHistorikkModal";
import { PersonIdentMedHistorikk } from "./PersonIdentMedHistorikk";
import {
  formaterBelop,
  formaterBlokkeringsarsak,
  getKildeText,
  getPersonIdent,
  getStatus,
  getYtelseTyper,
} from "~/saker/visning";

interface SakerPåSammePersonProps {
  saker: KontrollsakResponse[];
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
type KobleSakActionResult = { ok: true } | { ok: false; feil: { skjema?: string[] } };

function SakFelt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-4">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort size="small">{children}</BodyShort>
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
  const saksreferanse = getSaksreferanse(sak.id);
  const personIdent = getPersonIdent(sak);
  const harHistoriskIdent = sak.historiskeIdenter.some((ident) => ident.historisk);
  const statusTekst = getStatus(sak);
  const periodeText = getPeriodeText(sak);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const belop = getBelop(sak);
  const ytelseTyper = getYtelseTyper(sak);
  const tags = getTags(sak);
  const kildeTekst = getKildeText(sak);
  const enhet = sak.saksbehandlere.eier?.enhet ?? sak.saksbehandlere.opprettetAv.enhet ?? "Ukjent";
  const saksbehandler = sak.saksbehandlere.eier?.navn ?? sak.saksbehandlere.opprettetAv.navn;

  return (
    <Box borderWidth="1" borderColor="neutral-subtle" borderRadius="8" background="sunken">
      <VStack gap="space-16">
        <Box padding="space-16">
          <HStack justify="space-between" align="center" wrap gap="space-8">
            <HStack gap="space-16" align="center" wrap>
              <BodyShort size="small">
                Personnummer: <strong>{personIdent}</strong>
              </BodyShort>
              <BodyShort size="small">
                Saksid: <strong>{saksreferanse}</strong>
              </BodyShort>
              <BodyShort size="small">
                Enhet: <strong>{enhet}</strong>
              </BodyShort>
              <BodyShort size="small">
                Saksbehandler: <strong>{saksbehandler}</strong>
              </BodyShort>
              {sak.blokkert ? (
                <Tag variant="outline" data-color="warning" size="small">
                  {formaterBlokkeringsarsak(sak.blokkert)}
                </Tag>
              ) : (
                <Tag variant="outline" data-color="success" size="small">
                  {statusTekst}
                </Tag>
              )}
            </HStack>
            <Button
              variant="tertiary"
              size="xsmall"
              icon={åpen ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
              iconPosition="right"
              onClick={() => setÅpen((prev) => !prev)}
              aria-expanded={åpen}
            >
              {åpen ? "Skjul" : "Vis detaljer"}
            </Button>
          </HStack>
        </Box>

        {åpen && (
          <>
            <Box borderWidth="0 0 1 0" borderColor="neutral-subtle" />
            <Box padding="space-16">
              <VStack gap="space-24">
                <HGrid columns={{ xs: 1, sm: 2 }} gap="space-24">
                  <VStack gap="space-16">
                    <VStack gap="space-4">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Personnummer
                      </Detail>
                      <PersonIdentMedHistorikk
                        personIdent={personIdent}
                        harHistorikk={harHistoriskIdent}
                        onVisHistorikk={() => onVisIdentHistorikk(sak)}
                      />
                    </VStack>

                    {kategoriText && (
                      <SakFelt label="Kategori">
                        <Tag variant="outline" data-color="info" size="small">
                          {kategoriText}
                        </Tag>
                      </SakFelt>
                    )}

                    {misbrukstyper.length > 0 && (
                      <VStack gap="space-4">
                        <Detail className="text-ax-text-neutral-subtle" uppercase>
                          Misbrukstype
                        </Detail>
                        <HStack gap="space-4" wrap>
                          {misbrukstyper.map((type) => (
                            <Tag key={type} variant="outline" data-color="info" size="small">
                              {type}
                            </Tag>
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    {tags.length > 0 && (
                      <VStack gap="space-4">
                        <Detail className="text-ax-text-neutral-subtle" uppercase>
                          Merking
                        </Detail>
                        <HStack gap="space-4" wrap>
                          {tags.map((tag) => (
                            <Tag key={tag} variant="outline" data-color="info" size="small">
                              {tag}
                            </Tag>
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    <SakFelt label="Kilde">{kildeTekst}</SakFelt>
                  </VStack>

                  <VStack gap="space-16">
                    {periodeText && <SakFelt label="Periode">{periodeText}</SakFelt>}

                    {belop !== null && <SakFelt label="Ca. beløp">{formaterBelop(belop)}</SakFelt>}

                    {ytelseTyper.length > 0 && (
                      <VStack gap="space-4">
                        <Detail className="text-ax-text-neutral-subtle" uppercase>
                          Ytelse
                        </Detail>
                        <HStack gap="space-4" wrap>
                          {ytelseTyper.map((ytelse) => (
                            <Tag
                              key={ytelse}
                              variant="outline"
                              data-color="brand-beige"
                              size="small"
                            >
                              {ytelse}
                            </Tag>
                          ))}
                        </HStack>
                      </VStack>
                    )}
                  </VStack>
                </HGrid>

                <HStack justify="end" gap="space-8" wrap>
                  <Button
                    as={Link}
                    to={RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse)}
                    variant="primary"
                    size="small"
                  >
                    Gå til sak
                  </Button>
                  {kanEndreKobling && (
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
                  )}
                </HStack>
              </VStack>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
}

export function SakerPåSammePerson({
  saker,
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
    setFeilmelding(fetcher.data?.feil.skjema?.[0] ?? "Kunne ikke endre koblingen. Prøv igjen.");
  }, [fetcher.data, fetcher.state]);

  if (andreSaker.length === 0) {
    return null;
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
                  {valgtSaksreferanse}? Saksbehandlerne mister tilgangen til hverandres saker.
                </BodyShort>
              ) : (
                <>
                  <LocalAlert status="announcement">
                    <LocalAlert.Header>
                      <LocalAlert.Title as="h2">Lurt å vite før du kobler</LocalAlert.Title>
                    </LocalAlert.Header>
                    <LocalAlert.Content>
                      Når du kobler sakene, får saksbehandlerne på begge sakene tilgang til
                      hverandres saker - praktisk for å samarbeide bedre.
                    </LocalAlert.Content>
                  </LocalAlert>
                  <BodyShort>
                    Vil du koble sak {gjeldendeSaksreferanse} til sak {valgtSaksreferanse}
                    {valgtKategori ? ` ${valgtKategori}` : ""}?
                  </BodyShort>
                </>
              )}

              {feilmelding && <Alert variant="error">{feilmelding}</Alert>}
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
