import { MenuElipsisVerticalIcon } from "@navikt/aksel-icons";
import {
  ActionMenu,
  BodyShort,
  Button,
  Chips,
  Heading,
  HStack,
  Label,
  Page,
  Select,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { mockSaker } from "./mock-data";
import { SakHandlinger } from "./SakHandlinger";
import type { Sak, SakStatus } from "./typer";
import { sakStatusSchema } from "./typer";
import {
  filtrerSaker,
  formaterDato,
  formaterKilde,
  hentStatusVariant,
  hentUnikeYtelser,
  sorterSakerEtterDato,
  type Sorteringsretning,
} from "./utils";

export function loader() {
  return { saker: mockSaker };
}

export default function FordelingSide() {
  const { saker } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const sortering = (searchParams.get("sortering") ?? "nyest") as Sorteringsretning;

  const valgteStatuser = (searchParams.get("status")?.split(",").filter(Boolean) ?? []) as SakStatus[];
  const valgteYtelser = searchParams.get("ytelse")?.split(",").filter(Boolean) ?? [];
  const harAktiveFiltre = valgteStatuser.length > 0 || valgteYtelser.length > 0;

  const alleYtelser = hentUnikeYtelser(saker);
  const filtrerteSaker = filtrerSaker(saker, valgteStatuser, valgteYtelser);
  const sorterteSaker = sorterSakerEtterDato(filtrerteSaker, sortering);

  function oppdaterSearchParams(nøkkel: string, verdier: string[]) {
    setSearchParams((prev) => {
      const neste = new URLSearchParams(prev);
      if (verdier.length > 0) {
        neste.set(nøkkel, verdier.join(","));
      } else {
        neste.delete(nøkkel);
      }
      return neste;
    });
  }

  function toggleStatus(status: SakStatus) {
    const oppdatert = valgteStatuser.includes(status)
      ? valgteStatuser.filter((s) => s !== status)
      : [...valgteStatuser, status];
    oppdaterSearchParams("status", oppdatert);
  }

  function toggleYtelse(ytelse: string) {
    const oppdatert = valgteYtelser.includes(ytelse)
      ? valgteYtelser.filter((y) => y !== ytelse)
      : [...valgteYtelser, ytelse];
    oppdaterSearchParams("ytelse", oppdatert);
  }

  function nullstillFiltre() {
    setSearchParams((prev) => {
      const neste = new URLSearchParams(prev);
      neste.delete("status");
      neste.delete("ytelse");
      return neste;
    });
  }

  return (
    <Page>
      <title>Saker til fordeling – Watson Sak Admin</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Saker til fordeling
        </Heading>

        <div className="flex flex-col-reverse gap-6 md:flex-row">
          <div className="min-w-0 flex-1">
            <HStack gap="space-4" align="end" className="mb-4">
              <Select
                label="Sortering"
                value={sortering}
                onChange={(e) =>
                  setSearchParams((prev) => {
                    const neste = new URLSearchParams(prev);
                    neste.set("sortering", e.target.value);
                    return neste;
                  })
                }
                className="w-fit"
                size="small"
              >
                <option value="nyest">Nyest først</option>
                <option value="eldst">Eldst først</option>
              </Select>

              {harAktiveFiltre && (
                <BodyShort size="small">
                  Viser {sorterteSaker.length} av {saker.length} saker
                </BodyShort>
              )}
            </HStack>

            <VStack gap="space-4">
              {sorterteSaker.map((sak) => (
                <SakKort key={sak.id} sak={sak} />
              ))}
            </VStack>
          </div>

          <aside className="rounded-lg border border-gray-200 bg-gray-50 p-4 md:sticky md:top-4 md:w-72 md:shrink-0 md:self-start">
            <HStack justify="space-between" align="center" className="mb-3">
              <Heading level="2" size="small">
                Filtrering
              </Heading>
              {harAktiveFiltre && (
                <Button variant="tertiary" size="xsmall" onClick={nullstillFiltre}>
                  Nullstill
                </Button>
              )}
            </HStack>

            <VStack gap="space-4">
              <div>
                <Label size="small" spacing>
                  Status
                </Label>
                <Chips>
                  {sakStatusSchema.options.map((status) => (
                    <Chips.Toggle
                      key={status}
                      selected={valgteStatuser.includes(status)}
                      onClick={() => toggleStatus(status)}
                    >
                      {status}
                    </Chips.Toggle>
                  ))}
                </Chips>
              </div>

              <div>
                <Label size="small" spacing>
                  Ytelser
                </Label>
                <Chips>
                  {alleYtelser.map((ytelse) => (
                    <Chips.Toggle
                      key={ytelse}
                      selected={valgteYtelser.includes(ytelse)}
                      onClick={() => toggleYtelse(ytelse)}
                    >
                      {ytelse}
                    </Chips.Toggle>
                  ))}
                </Chips>
              </div>
            </VStack>
          </aside>
        </div>
      </PageBlock>
    </Page>
  );
}

function SakKort({ sak }: { sak: Sak }) {
  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        to={RouteConfig.FORDELING_DETALJ.replace(":sakId", sak.id)}
        className="absolute inset-0 rounded-lg"
        aria-label={`Sak ${sak.id}`}
      />
      <HStack justify="space-between" align="start">
        <VStack gap="space-2">
          <HStack gap="space-4" align="center">
            <Heading level="2" size="small">
              Sak {sak.id}
            </Heading>
            <Tag variant={hentStatusVariant(sak.status)} size="small">
              {sak.status}
            </Tag>
          </HStack>

          <HStack gap="space-4">
            <BodyShort size="small" className="text-gray-600">
              Innmeldt: {formaterDato(sak.datoInnmeldt)}
            </BodyShort>
            <BodyShort size="small" className="text-gray-600">
              Kilde: {formaterKilde(sak.kilde)}
            </BodyShort>
            <BodyShort size="small" className="text-gray-600">
              Seksjon: {sak.seksjon}
            </BodyShort>
          </HStack>

          <BodyShort size="small">Ytelser: {sak.ytelser.join(", ")}</BodyShort>
        </VStack>

        <div className="relative z-10">
          <ActionMenu>
            <ActionMenu.Trigger>
              <Button
                variant="tertiary-neutral"
                icon={<MenuElipsisVerticalIcon title="Handlinger" />}
                size="small"
              />
            </ActionMenu.Trigger>
            <ActionMenu.Content>
              <SakHandlinger sakId={sak.id} />
            </ActionMenu.Content>
          </ActionMenu>
        </div>
      </HStack>
    </div>
  );
}
