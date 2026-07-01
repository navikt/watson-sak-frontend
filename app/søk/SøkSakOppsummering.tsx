import { CalendarIcon, TagIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
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

/**
 * Stor visning av en enkelt sak, brukt når man søker på saksnummer (som alltid
 * gir 0 eller 1 treff). Viser mer detaljer enn den kompakte tabellraden som
 * brukes for fnr-/orgnr-søk med potensielt mange treff.
 */
export function SøkSakOppsummering({ sak }: SøkSakOppsummeringProps) {
  const detaljSti = RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id));
  const saksreferanse = getSaksreferanse(sak.id);
  const eier = sak.saksbehandlere.eier;
  const misbrukstyper = sak.misbruktype;

  return (
    <Kort
      as="article"
      padding="space-24"
      className="focus-within:[outline:3px_solid_var(--ax-border-focus)] focus-within:outline-offset-[3px]"
    >
      <VStack gap="space-6">
        <HStack gap="space-4" align="center" justify="space-between">
          <Link
            to={detaljSti}
            state={{ tilbake: { to: RouteConfig.SØK, label: "Søk" } }}
            className="no-underline focus-visible:outline-none"
            onClick={() => sporHendelse("søk resultat valgt")}
          >
            <Heading level="2" size="medium">
              Sak {saksreferanse}
            </Heading>
          </Link>
          {sak.blokkert ? (
            <Tag variant="outline" data-color="warning" size="small">
              {formaterBlokkeringsarsak(sak.blokkert)}
            </Tag>
          ) : (
            <Tag variant="outline" data-color="success" size="small">
              {getStatus(sak)}
            </Tag>
          )}
        </HStack>

        <HStack gap="space-6" align="center" wrap>
          <HStack gap="space-2" align="center">
            <CalendarIcon aria-hidden fontSize="1rem" />
            <Detail>{formaterDato(getOpprettetDato(sak))}</Detail>
          </HStack>
          <Detail>{getKildeText(sak)}</Detail>
          <Detail>Fnr: {getPersonIdent(sak)}</Detail>
          {getKategoriText(sak) && (
            <HStack gap="space-2" align="center">
              <TagIcon aria-hidden fontSize="1rem" />
              <Detail>{getKategoriText(sak)}</Detail>
            </HStack>
          )}
          <Detail>Prioritet: {formaterPrioritet(sak.prioritet)}</Detail>
          <Detail>Saksbehandler: {eier?.navn ?? "Ikke tildelt"}</Detail>
        </HStack>

        {(misbrukstyper.length > 0 || sak.merking.length > 0) && (
          <VStack gap="space-2">
            {misbrukstyper.length > 0 && (
              <HStack gap="space-2" wrap>
                {misbrukstyper.map((type) => (
                  <Tag key={type} variant="outline" data-color="info" size="small">
                    {formaterMisbrukstype(type)}
                  </Tag>
                ))}
              </HStack>
            )}
            {sak.merking.length > 0 && (
              <HStack gap="space-2" wrap>
                {sak.merking.map((merke) => (
                  <Tag key={merke} variant="outline" data-color="neutral" size="small">
                    {merke}
                  </Tag>
                ))}
              </HStack>
            )}
          </VStack>
        )}

        {getBeskrivelse(sak) && <BodyShort size="small">{getBeskrivelse(sak)}</BodyShort>}

        <div>
          <Button
            as={Link}
            to={detaljSti}
            state={{ tilbake: { to: RouteConfig.SØK, label: "Søk" } }}
            variant="secondary"
            size="small"
            onClick={() => sporHendelse("søk resultat valgt")}
          >
            Åpne sak
          </Button>
        </div>
      </VStack>
    </Kort>
  );
}
