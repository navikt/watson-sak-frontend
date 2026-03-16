import {
  BodyShort,
  Button,
  Chips,
  Heading,
  HStack,
  Label,
  Search,
  Select,
  Tag,
  VStack,
} from "@navikt/ds-react";
import {
  CalendarIcon,
  ChevronRightIcon,
  EnvelopeClosedIcon,
  Buildings2Icon,
} from "@navikt/aksel-icons";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { formaterDato } from "~/utils/date-utils";
import type { Sak, SakStatus } from "./typer";
import { sakStatusSchema } from "./typer";
import {
  filtrerSaker,
  formaterKilde,
  hentStatusVariant,
  hentUnikeYtelser,
  sorterSakerEtterDato,
  søkISaker,
  type Sorteringsretning,
} from "./utils";

interface SaksListeProps {
  saker: Sak[];
  /** Base-sti for sak-detaljlenker, f.eks. "/saker" → "/saker/:sakId" */
  detaljSti: string;
  /** Valgfri handlingsmeny som vises på hvert kort */
  handlinger?: (sak: Sak) => ReactNode;
}

/**
 * Gjenbrukbar saksliste med kort-visning, sortering, filtrering og søk.
 * Styres via URL search params (sok, status, ytelse, sortering).
 */
export function SaksListe({ saker, detaljSti, handlinger }: SaksListeProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sorteringParam = searchParams.get("sortering");
  const sortering: Sorteringsretning = sorteringParam === "eldst" ? "eldst" : "nyest";

  const søketekst = searchParams.get("sok") ?? "";
  const valgteStatuser: SakStatus[] = (
    searchParams.get("status")?.split(",").filter(Boolean) ?? []
  ).filter((s): s is SakStatus => sakStatusSchema.safeParse(s).success);
  const valgteYtelser = searchParams.get("ytelse")?.split(",").filter(Boolean) ?? [];
  const harAktiveFiltre =
    valgteStatuser.length > 0 || valgteYtelser.length > 0 || søketekst.length > 0;

  const alleYtelser = hentUnikeYtelser(saker);
  const sakerEtterSøk = søkISaker(saker, søketekst);
  const filtrerteSaker = filtrerSaker(sakerEtterSøk, valgteStatuser, valgteYtelser);
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
      neste.delete("sok");
      neste.delete("status");
      neste.delete("ytelse");
      return neste;
    });
  }

  return (
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
            <SakKort key={sak.id} sak={sak} detaljSti={detaljSti} handlinger={handlinger} />
          ))}
        </VStack>
      </div>

      <aside className="rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-neutral-soft p-4 md:sticky md:top-4 md:w-72 md:shrink-0 md:self-start">
        <HStack justify="space-between" align="center" className="mb-3">
          <Label as="p" size="small">
            Filtrering
          </Label>
          {harAktiveFiltre && (
            <Button variant="tertiary" size="xsmall" onClick={nullstillFiltre}>
              Nullstill
            </Button>
          )}
        </HStack>

        <VStack gap="space-4">
          <Search
            label="Søk i saker"
            size="small"
            variant="simple"
            value={søketekst}
            onChange={(verdi) => oppdaterSearchParams("sok", verdi ? [verdi] : [])}
            onClear={() => oppdaterSearchParams("sok", [])}
          />

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
  );
}

function statusAccentKlasse(status: SakStatus): string {
  const farge: Record<SakStatus, string> = {
    "tips mottatt": "bg-ax-bg-info-strong",
    "tips avklart": "bg-ax-bg-warning-strong",
    "under utredning": "bg-ax-bg-warning-strong",
    "videresendt til nay/nfp": "bg-ax-bg-success-strong",
    avsluttet: "bg-ax-bg-neutral-moderate",
    henlagt: "bg-ax-bg-neutral-moderate",
  };
  return farge[status];
}

function SakKort({
  sak,
  detaljSti,
  handlinger,
}: {
  sak: Sak;
  detaljSti: string;
  handlinger?: (sak: Sak) => ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-default shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${statusAccentKlasse(sak.status)}`}
        aria-hidden
      />
      <Link
        to={`${detaljSti}/${sak.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`Sak ${sak.id}`}
      />
      <HStack justify="space-between" align="center" className="py-5 pr-5 pl-6">
        <VStack gap="space-4">
          <HStack gap="space-4" align="center">
            <Heading size="xsmall" as="h2">
              Sak {sak.id}
            </Heading>
            <Tag variant={hentStatusVariant(sak.status)} size="small">
              {sak.status}
            </Tag>
          </HStack>

          <HStack gap="space-6" align="center" wrap>
            <HStack as="span" gap="space-2" align="center">
              <CalendarIcon
                aria-hidden
                className="shrink-0 text-ax-text-neutral-subtle"
                fontSize="1.25rem"
              />
              <BodyShort size="small" className="text-ax-text-neutral-subtle">
                {formaterDato(sak.datoInnmeldt)}
              </BodyShort>
            </HStack>

            <HStack as="span" gap="space-2" align="center">
              <EnvelopeClosedIcon
                aria-hidden
                className="shrink-0 text-ax-text-neutral-subtle"
                fontSize="1.25rem"
              />
              <BodyShort size="small" className="text-ax-text-neutral-subtle">
                {formaterKilde(sak.kilde)}
              </BodyShort>
            </HStack>

            <HStack as="span" gap="space-2" align="center">
              <Buildings2Icon
                aria-hidden
                className="shrink-0 text-ax-text-neutral-subtle"
                fontSize="1.25rem"
              />
              <BodyShort size="small" className="text-ax-text-neutral-subtle">
                {sak.seksjon}
              </BodyShort>
            </HStack>
          </HStack>

          <HStack gap="space-2" wrap>
            {sak.ytelser.map((ytelse) => (
              <Tag key={ytelse} variant="neutral" size="small">
                {ytelse}
              </Tag>
            ))}
          </HStack>
        </VStack>

        <HStack align="center" gap="space-4" className="shrink-0">
          {handlinger && <div className="relative z-10">{handlinger(sak)}</div>}
          <ChevronRightIcon aria-hidden className="text-ax-text-neutral-subtle" fontSize="1.5rem" />
        </HStack>
      </HStack>
    </div>
  );
}
