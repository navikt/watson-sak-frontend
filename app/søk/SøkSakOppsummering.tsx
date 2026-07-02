import { ArrowRightIcon, CalendarIcon } from "@navikt/aksel-icons";
import {
  Box,
  BodyShort,
  Button,
  CopyButton,
  Detail,
  Heading,
  HGrid,
  HStack,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { Link } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { getKategoriText, getOpprettetDato } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  formaterBlokkeringsarsak,
  formaterMisbrukstype,
  formaterPrioritet,
  getBeskrivelse,
  getKildeText,
  getPersonIdent,
  getStatus,
} from "~/saker/visning";
import { formaterDato } from "~/utils/date-utils";

interface SøkSakOppsummeringProps {
  sak: KontrollsakResponse;
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-1">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      {children}
    </VStack>
  );
}

function TagListe({ tags }: { tags: string[] }) {
  return (
    <HStack gap="space-2" wrap>
      {tags.map((tag) => (
        <Tag key={tag} variant="outline" data-color="info" size="small">
          {tag}
        </Tag>
      ))}
    </HStack>
  );
}

/**
 * Stor visning av en enkelt sak, brukt når man søker på saksnummer (som alltid
 * gir 0 eller 1 treff). Bruker mer plass og en tydeligere struktur enn den
 * kompakte tabellraden som brukes for fnr-/orgnr-søk med potensielt mange
 * treff, slik at søkeren raskt kan orientere seg i sakens nøkkelinformasjon
 * uten å måtte åpne den.
 */
export function SøkSakOppsummering({ sak }: SøkSakOppsummeringProps) {
  const detaljSti = RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id));
  const saksreferanse = getSaksreferanse(sak.id);
  const tilbakeState = { tilbake: { to: RouteConfig.SØK, label: "Søk" } };
  const eier = sak.saksbehandlere.eier;
  const misbrukstyper = sak.misbruktype;
  const kategoriText = getKategoriText(sak);
  const beskrivelse = getBeskrivelse(sak);

  function sporSøkResultatValgt() {
    sporHendelse("søk resultat valgt");
  }

  return (
    <Kort
      as="article"
      padding="space-32"
      className="focus-within:[outline:3px_solid_var(--ax-border-focus)] focus-within:outline-offset-[3px]"
    >
      <VStack gap="space-8">
        <HStack gap="space-4" align="start" justify="space-between" wrap>
          <VStack gap="space-1">
            <Link
              to={detaljSti}
              state={tilbakeState}
              className="no-underline focus-visible:outline-none"
              onClick={sporSøkResultatValgt}
            >
              <Heading level="2" size="large">
                Sak {saksreferanse}
              </Heading>
            </Link>
            <HStack gap="space-2" align="center">
              <CalendarIcon aria-hidden fontSize="1rem" className="text-ax-icon-neutral-subtle" />
              <Detail className="text-ax-text-neutral-subtle">
                Opprettet {formaterDato(getOpprettetDato(sak))} · {getKildeText(sak)}
              </Detail>
            </HStack>
          </VStack>

          <HStack gap="space-2">
            {sak.blokkert && (
              <Tag variant="outline" data-color="warning" size="medium">
                {formaterBlokkeringsarsak(sak.blokkert)}
              </Tag>
            )}
            <Tag variant="outline" data-color="success" size="medium">
              {getStatus(sak)}
            </Tag>
          </HStack>
        </HStack>

        <hr className="border-ax-border-neutral-subtle" />

        <HGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="space-16">
          <VStack gap="space-6">
            <Felt label="Personnummer">
              <HStack gap="space-1" align="center">
                <BodyShort>{getPersonIdent(sak)}</BodyShort>
                <CopyButton size="xsmall" copyText={getPersonIdent(sak)} />
              </HStack>
            </Felt>

            {kategoriText && (
              <Felt label="Kategori">
                <div>
                  <Tag variant="outline" data-color="info" size="small">
                    {kategoriText}
                  </Tag>
                </div>
              </Felt>
            )}

            {misbrukstyper.length > 0 && (
              <Felt label="Misbrukstype">
                <TagListe tags={misbrukstyper.map(formaterMisbrukstype)} />
              </Felt>
            )}

            {sak.merking.length > 0 && (
              <Felt label="Merking">
                <TagListe tags={sak.merking} />
              </Felt>
            )}

            {beskrivelse && (
              <Felt label="Beskrivelse">
                <BodyShort>{beskrivelse}</BodyShort>
              </Felt>
            )}
          </VStack>

          <Box background="neutral-soft" borderRadius="8" padding="space-16">
            <VStack gap="space-4">
              <Felt label="Prioritet">
                <BodyShort>{formaterPrioritet(sak.prioritet)}</BodyShort>
              </Felt>
              <Felt label="Saksbehandler">
                <BodyShort>{eier?.navn ?? "Ikke tildelt"}</BodyShort>
              </Felt>
            </VStack>
          </Box>
        </HGrid>

        <HStack justify="end">
          <Button
            as={Link}
            to={detaljSti}
            state={tilbakeState}
            variant="primary"
            icon={<ArrowRightIcon aria-hidden />}
            iconPosition="right"
            onClick={sporSøkResultatValgt}
          >
            Åpne sak
          </Button>
        </HStack>
      </VStack>
    </Kort>
  );
}
