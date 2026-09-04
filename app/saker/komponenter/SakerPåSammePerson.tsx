import { ChevronDownIcon, ChevronUpIcon, LinkBrokenIcon, LinkIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Modal,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { finnEnhetsnavn } from "~/kodeverk/enheter";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { getKategoriText, getSaksenhet } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { storFørsteBokstavPerOrd } from "~/utils/string-utils";
import { PersonIdentHistorikkModal } from "./PersonIdentHistorikkModal";
import { SakDetaljerFelter } from "./SakDetaljerFelter";
import { formaterBlokkeringsarsak, getPersonIdent, getStatus } from "~/saker/visning";

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

function SakKort({
  sak,
  erKoblet,
  kanEndreKobling,
  onEndreKobling,
  onVisIdentHistorikk,
}: SakKortProps) {
  const [åpen, setÅpen] = useState(false);
  const kodeverk = useKodeverk();
  const saksreferanse = getSaksreferanse(sak.id);
  const personIdent = getPersonIdent(sak);
  const statusTekst = getStatus(sak);
  const enhetskode = getSaksenhet(sak);
  const enhet = enhetskode ? finnEnhetsnavn(kodeverk.enheter, enhetskode) : "Ukjent";
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
                Saksid: <strong>#{saksreferanse}</strong>
              </BodyShort>
              <BodyShort size="small">
                Enhet: <strong>{enhet}</strong>
              </BodyShort>
              <BodyShort size="small">
                Saksbehandler: <strong>{storFørsteBokstavPerOrd(saksbehandler)}</strong>
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
                <SakDetaljerFelter sak={sak} onVisIdentHistorikk={() => onVisIdentHistorikk(sak)} />

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
                  {valgtSaksreferanse}?
                </BodyShort>
              ) : (
                <BodyShort>
                  Vil du koble sak {gjeldendeSaksreferanse} til sak {valgtSaksreferanse}
                  {valgtKategori ? ` ${valgtKategori}` : ""}?
                </BodyShort>
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
