import { BodyShort, Heading, HGrid, Link, Table, VStack } from "@navikt/ds-react";
import { Link as RouterLink } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { formaterStatus } from "~/saker/visning";
import {
  LEDERSTATISTIKK_STATUSER,
  type LederArbeidsstatus,
  type LederEnhetStatistikk,
} from "../types";

const arbeidsstatusEtiketter: Record<LederArbeidsstatus, string> = {
  IKKE_BLOKKERT: "Ikke blokkert",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  I_BERO: "I bero",
};

const arbeidsstatusrekkefølge = Object.keys(arbeidsstatusEtiketter) as LederArbeidsstatus[];

/** Viser overordnede nøkkeltall og fordeling på status og arbeidsstatus. */
export function Enhetsstatistikk({
  statistikk,
  enhetId,
}: {
  statistikk: LederEnhetStatistikk;
  enhetId: string;
}) {
  return (
    <VStack gap="space-12">
      <HGrid columns={{ xs: 1, sm: 3 }} gap="space-8">
        <Nøkkeltall
          etikett="Ikke avsluttede saker"
          antall={statistikk.totaltAntallIkkeAvsluttede}
        />
        <Nøkkeltall etikett="Over frist" antall={statistikk.antallOverFrist} />
        <Nøkkeltall etikett="Ufordelte" antall={statistikk.antallUfordelte} />
      </HGrid>

      <HGrid columns={{ xs: 1, md: 2 }} gap="space-12">
        <Kort as="section">
          <VStack gap="space-4">
            <Heading level="2" size="medium">
              Saker per status
            </Heading>
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Status</Table.HeaderCell>
                  <Table.HeaderCell scope="col" className="text-right">
                    Antall
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {LEDERSTATISTIKK_STATUSER.map((status) => (
                  <Table.Row key={status}>
                    <Table.DataCell>
                      <Link
                        as={RouterLink}
                        to={`${RouteConfig.ALLE_SAKER}?enhet=${enhetId}&status=${status}`}
                      >
                        {formaterStatus(status)}
                      </Link>
                    </Table.DataCell>
                    <Table.DataCell className="text-right">
                      {statistikk.perStatus[status]}
                    </Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </VStack>
        </Kort>

        <Kort as="section">
          <VStack gap="space-4">
            <Heading level="2" size="medium">
              Saker per arbeidsstatus
            </Heading>
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Arbeidsstatus</Table.HeaderCell>
                  <Table.HeaderCell scope="col" className="text-right">
                    Antall
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {arbeidsstatusrekkefølge.map((arbeidsstatus) => (
                  <Table.Row key={arbeidsstatus}>
                    <Table.DataCell>{arbeidsstatusEtiketter[arbeidsstatus]}</Table.DataCell>
                    <Table.DataCell className="text-right">
                      {statistikk.perArbeidsstatus[arbeidsstatus]}
                    </Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </VStack>
        </Kort>
      </HGrid>
    </VStack>
  );
}

function Nøkkeltall({ etikett, antall }: { etikett: string; antall: number }) {
  return (
    <Kort>
      <VStack gap="space-2">
        <BodyShort className="text-ax-text-neutral-subtle">{etikett}</BodyShort>
        <Heading level="2" size="large">
          {antall.toLocaleString("nb-NO")}
        </Heading>
      </VStack>
    </Kort>
  );
}
