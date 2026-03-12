import { BodyShort, Heading, HGrid, Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import {
  BarChartIcon,
  CheckmarkCircleIcon,
  HourglassIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { useLoaderData } from "react-router";
import {
  beregnAntallPerSeksjon,
  beregnAntallPerStatus,
  beregnBehandlingstid,
  beregnFordelingPerAntallYtelser,
  beregnFordelingPerYtelse,
} from "./beregninger";
import { BehandlingstidVisning } from "./komponenter/BehandlingstidVisning";
import { HorisontaltSoylediagram } from "./komponenter/HorisontaltSoylediagram";
import { Nokkeltallkort } from "./komponenter/Nokkeltallkort";
import { VertikaltSoylediagram } from "./komponenter/VertikaltSoylediagram";
import { mockAvslutningsdatoer, mockStatistikkSaker } from "./mock-data.server";

export function loader() {
  const saker = mockStatistikkSaker;

  return {
    totaltAntall: saker.length,
    antallPerStatus: beregnAntallPerStatus(saker),
    behandlingstid: beregnBehandlingstid(saker, mockAvslutningsdatoer),
    antallPerSeksjon: beregnAntallPerSeksjon(saker),
    fordelingPerYtelse: beregnFordelingPerYtelse(saker),
    fordelingPerAntallYtelser: beregnFordelingPerAntallYtelser(saker),
  };
}

export default function StatistikkSide() {
  const {
    totaltAntall,
    antallPerStatus,
    behandlingstid,
    antallPerSeksjon,
    fordelingPerYtelse,
    fordelingPerAntallYtelser,
  } = useLoaderData<typeof loader>();

  const statusData = Object.entries(antallPerStatus).map(([navn, antall]) => ({
    navn,
    antall,
  }));

  return (
    <Page>
      <title>Statistikk – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-12" className="mt-4 mb-8">
          <Heading level="1" size="large">
            Statistikk
          </Heading>

          <section aria-labelledby="nøkkeltall-heading">
            <Heading level="2" size="medium" spacing id="nøkkeltall-heading">
              Nøkkeltall
            </Heading>
            <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
              <Nokkeltallkort
                tittel="Totalt"
                verdi={totaltAntall}
                ikon={<BarChartIcon aria-hidden fontSize="1.5rem" />}
              />
              <Nokkeltallkort
                tittel="Under utredning"
                verdi={antallPerStatus["under utredning"]}
                ikon={<HourglassIcon aria-hidden fontSize="1.5rem" />}
              />
              <Nokkeltallkort
                tittel="Avsluttet"
                verdi={antallPerStatus.avsluttet}
                ikon={<CheckmarkCircleIcon aria-hidden fontSize="1.5rem" />}
              />
              <Nokkeltallkort
                tittel="Henlagt"
                verdi={antallPerStatus.henlagt}
                ikon={<XMarkOctagonIcon aria-hidden fontSize="1.5rem" />}
              />
            </HGrid>
          </section>

          <section aria-labelledby="status-heading">
            <Heading level="2" size="medium" spacing id="status-heading">
              Saker per status
            </Heading>
            <HorisontaltSoylediagram
              data={statusData}
              ariaLabel={`Søylediagram over saker per status. ${statusData.map((s) => `${s.navn}: ${s.antall}`).join(", ")}`}
            />
          </section>

          {behandlingstid && (
            <section aria-labelledby="behandlingstid-heading">
              <Heading level="2" size="medium" spacing id="behandlingstid-heading">
                Behandlingstid (dager)
              </Heading>
              <BehandlingstidVisning behandlingstid={behandlingstid} />
            </section>
          )}

          <section aria-labelledby="seksjon-heading">
            <Heading level="2" size="medium" spacing id="seksjon-heading">
              Saker per seksjon
            </Heading>
            <HorisontaltSoylediagram
              data={antallPerSeksjon}
              ariaLabel={`Søylediagram over saker per seksjon. ${antallPerSeksjon.map((s) => `${s.navn}: ${s.antall}`).join(", ")}`}
            />
          </section>

          <section aria-labelledby="ytelse-heading">
            <Heading level="2" size="medium" spacing id="ytelse-heading">
              Fordeling per ytelse
            </Heading>
            <BodyShort spacing className="text-ax-text-neutral-subtle">
              En sak kan ha flere ytelser, så summen kan overstige totalt antall saker
            </BodyShort>
            <HorisontaltSoylediagram
              data={fordelingPerYtelse}
              ariaLabel={`Søylediagram over fordeling per ytelse. ${fordelingPerYtelse.map((y) => `${y.navn}: ${y.antall}`).join(", ")}`}
            />
          </section>

          <section aria-labelledby="antall-ytelser-heading">
            <Heading level="2" size="medium" spacing id="antall-ytelser-heading">
              Fordeling per antall ytelser
            </Heading>
            <VertikaltSoylediagram
              data={fordelingPerAntallYtelser}
              ariaLabel={`Søylediagram over fordeling per antall ytelser. ${fordelingPerAntallYtelser.map((y) => `${y.navn}: ${y.antall}`).join(", ")}`}
            />
          </section>
        </VStack>
      </PageBlock>
    </Page>
  );
}
