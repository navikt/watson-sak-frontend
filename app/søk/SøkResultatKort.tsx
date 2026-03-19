import { CalendarIcon, TagIcon } from "@navikt/aksel-icons";
import { BodyShort, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { Link } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import type { Sak } from "~/saker/typer";
import { formaterKilde, hentStatusVariant } from "~/saker/utils";
import { formaterDato } from "~/utils/date-utils";

interface SøkResultatKortProps {
  sak: Sak;
}

export function SøkResultatKort({ sak }: SøkResultatKortProps) {
  const detaljSti = RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id);

  return (
    <Kort
      as="article"
      className="focus-within:[outline:3px_solid_var(--ax-border-focus)] focus-within:outline-offset-[3px]"
    >
      <VStack gap="space-4">
        <HStack gap="space-4" align="center" justify="space-between">
          <Link to={detaljSti} className="no-underline focus-visible:outline-none">
            <Heading level="3" size="small">
              Sak {sak.id}
            </Heading>
          </Link>
          <Tag variant={hentStatusVariant(sak.status)} size="small">
            {sak.status}
          </Tag>
        </HStack>

        <HStack gap="space-6" align="center" wrap>
          <HStack gap="space-2" align="center">
            <CalendarIcon aria-hidden fontSize="1rem" />
            <Detail>{formaterDato(sak.datoInnmeldt)}</Detail>
          </HStack>
          <Detail>{formaterKilde(sak.kilde)}</Detail>
          <Detail>Fnr: {sak.fødselsnummer}</Detail>
          {sak.kategori && (
            <HStack gap="space-2" align="center">
              <TagIcon aria-hidden fontSize="1rem" />
              <Detail>{sak.kategori}</Detail>
            </HStack>
          )}
        </HStack>

        {sak.tags.length > 0 && (
          <HStack gap="space-2" wrap>
            {sak.tags.map((tag) => (
              <Tag key={tag} variant="neutral" size="xsmall">
                {tag}
              </Tag>
            ))}
          </HStack>
        )}

        {sak.beskrivelse && (
          <BodyShort size="small" truncate>
            {sak.beskrivelse}
          </BodyShort>
        )}
      </VStack>
    </Kort>
  );
}
