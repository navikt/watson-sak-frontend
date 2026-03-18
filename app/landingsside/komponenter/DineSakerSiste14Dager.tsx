import {
  PieChartIcon,
  CheckmarkCircleIcon,
  HourglassIcon,
  PaperplaneIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Heading, HGrid, HStack, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";
import { Nokkeltallkort } from "~/statistikk/komponenter/Nokkeltallkort";
import type { DineSakerSiste14DagerStatistikk } from "../beregninger";

interface DineSakerSiste14DagerProps {
  statistikk: DineSakerSiste14DagerStatistikk;
}

export function DineSakerSiste14Dager({ statistikk }: DineSakerSiste14DagerProps) {
  const valgfrieKort = [
    statistikk.antallTipsAvklart > 0
      ? {
          tittel: "Tips avklart",
          verdi: statistikk.antallTipsAvklart,
          ikon: <CheckmarkCircleIcon aria-hidden fontSize="1.25rem" />,
        }
      : null,
    statistikk.antallSendtTilNayNfp > 0
      ? {
          tittel: "Sendt til NAY/NFP",
          verdi: statistikk.antallSendtTilNayNfp,
          ikon: <PaperplaneIcon aria-hidden fontSize="1.25rem" />,
        }
      : null,
  ].filter((kort) => kort !== null);

  return (
    <Kort as="section">
      <VStack gap="space-4">
        <div>
          <HStack gap="space-4" align="center">
            <PieChartIcon aria-hidden fontSize="1.25rem" />
            <Heading level="2" size="medium">
              Dine saker siste 14 dager
            </Heading>
          </HStack>
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Basert på dato innmeldt de siste 14 dagene.
          </BodyShort>
        </div>

        <HGrid columns={{ xs: 1, sm: 2 }} gap="space-4">
          <Nokkeltallkort
            tittel="Behandlet"
            verdi={statistikk.antallSakerJobbetMed}
            ikon={<HourglassIcon aria-hidden fontSize="1.25rem" />}
            gap="space-6"
          />
          <Nokkeltallkort
            tittel="Dager behandlingstid, snitt"
            verdi={statistikk.snittBehandlingstidPerSak ?? 0}
            ikon={<HourglassIcon aria-hidden fontSize="1.25rem" />}
            gap="space-6"
          />
          {valgfrieKort.map((kort) => (
            <Nokkeltallkort
              key={kort.tittel}
              tittel={kort.tittel}
              verdi={kort.verdi}
              ikon={kort.ikon}
              gap="space-6"
            />
          ))}
          <Nokkeltallkort
            tittel="Henlagte saker"
            verdi={statistikk.antallHenlagteSaker}
            ikon={<XMarkOctagonIcon aria-hidden fontSize="1.25rem" />}
            gap="space-6"
          />
          <Nokkeltallkort
            tittel="Henlagte tips"
            verdi={statistikk.antallHenlagteTips}
            ikon={<XMarkOctagonIcon aria-hidden fontSize="1.25rem" />}
            gap="space-6"
          />
        </HGrid>
      </VStack>
    </Kort>
  );
}
