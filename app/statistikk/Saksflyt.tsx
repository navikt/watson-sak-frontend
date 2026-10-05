import { BodyShort, Box, HGrid } from "@navikt/ds-react";
import { Fragment, type ComponentProps } from "react";
import { Link as RouterLink } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { Diagramkort } from "./Diagramkort";
import type { Statistikk } from "./types";
import { formaterAntallSaker, prosentFormatter, visningsnavn } from "./visning";

const FARGE_FOR_STEG: Record<string, ComponentProps<typeof Box>["background"]> = {
  OPPRETTET: "accent-strong",
  UTREDES: "brand-blue-strong",
  UTREDNING: "brand-blue-strong",
  FORVALTNING: "info-strong",
  STRAFFERETTSLIG_VURDERING: "brand-magenta-strong",
  POLITI: "brand-beige-strong",
};

const formatter = new Intl.NumberFormat("nb-NO");

const NAVN_FOR_STEG: Record<string, string> = {
  UTREDNING: "Utredet",
  UTREDES: "Utredet",
  UTREDET: "Utredet",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdert",
  STRAFFERETTSLIG_VURDERT: "Strafferettslig vurdert",
  POLITI: "Politiet",
};

export function Saksflyt({ data }: { data: Statistikk["statusfordeling"] }) {
  const steg = data.filter((rad) => rad.navn.toLocaleUpperCase("nb-NO") !== "HENLAGT");

  return (
    <Diagramkort title="Saksflyt" className="lg:col-span-2">
      <HGrid
        columns={{ xs: 1, md: "minmax(0, 14rem) minmax(0, 1fr)" }}
        gap={{ xs: "space-4", md: "space-0 space-12" }}
        align="center"
      >
        {steg.map((rad) => {
          const kode = rad.navn.toLocaleUpperCase("nb-NO").replaceAll(" ", "_");
          const navn = NAVN_FOR_STEG[kode] ?? visningsnavn(rad.navn);
          return (
            <Fragment key={rad.navn}>
              <BodyShort size="small" weight="semibold" className="min-w-0 md:text-right">
                {navn}
              </BodyShort>
              <Box
                borderColor="neutral-subtle"
                borderWidth="0 0 0 1"
                paddingInline="space-8 space-56"
                paddingBlock="space-2"
                className="min-w-0"
              >
                <Box position="relative" height="var(--ax-space-48)">
                  {rad.verdi === 0 ? (
                    <BodyShort
                      size="small"
                      weight="semibold"
                      className="flex h-full items-center justify-center"
                    >
                      0
                    </BodyShort>
                  ) : (
                    <Box
                      as={RouterLink}
                      to={`${RouteConfig.ALLE_SAKER}?${new URLSearchParams({ steg: rad.filterverdi })}`}
                      aria-label={`${navn}: ${formaterAntallSaker(rad.verdi)}${rad.prosent === 100 ? "" : `, ${prosentFormatter.format(rad.prosent)} %`}`}
                      background={FARGE_FOR_STEG[rad.filterverdi] ?? "accent-strong"}
                      width={`${rad.prosent}%`}
                      height="100%"
                      marginInline="auto"
                      className="flex items-center justify-center no-underline"
                    >
                      <BodyShort
                        as="span"
                        size="small"
                        weight="semibold"
                        className={
                          rad.prosent < 10
                            ? "absolute text-ax-text-neutral"
                            : "text-ax-text-neutral-contrast"
                        }
                        style={
                          rad.prosent < 10
                            ? { left: `calc(${50 + rad.prosent / 2}% + var(--ax-space-8))` }
                            : undefined
                        }
                      >
                        {formatter.format(rad.verdi)}
                      </BodyShort>
                    </Box>
                  )}
                  {rad.prosent !== 100 && (
                    <BodyShort
                      aria-hidden={rad.verdi > 0}
                      size="small"
                      className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-ax-text-neutral-subtle"
                      style={{
                        left: `calc(${rad.verdi > 0 && rad.prosent < 10 ? 100 : 50 + rad.prosent / 2}% + var(--ax-space-8))`,
                      }}
                    >
                      {prosentFormatter.format(rad.prosent)} %
                    </BodyShort>
                  )}
                </Box>
              </Box>
            </Fragment>
          );
        })}
      </HGrid>
    </Diagramkort>
  );
}
