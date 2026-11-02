import { InboxDownIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Box,
  Button,
  Chips,
  Heading,
  HGrid,
  HStack,
  Modal,
  Pagination,
  Select,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import { Form, Link, useFetcher, useSearchParams } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { formaterFødselsnummer } from "~/utils/string-utils";
import { sporHendelse } from "~/analytics/analytics";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import type { TildelingsSvar } from "./MigreringSide.server";
import {
  hentMigreringsstatus,
  MIGRERING_SIDESTORRELSE,
  MIGRERINGSSTATUSER,
  statusEtikett,
  type MigreringAnsatt,
  type MigreringKandidat,
  type MigreringLister,
  type Migreringsstatus,
  type MigreringSide,
} from "./types";

const STATUSFARGE: Record<Migreringsstatus, "neutral" | "warning" | "success"> = {
  IKKE_PABEGYNT: "neutral",
  UNDER_MIGRERING: "warning",
  FULLSTENDIG: "success",
};

/** Hele raden er klikkbar. Lenken eller knappen i raden gjør jobben, så tastatur og skjermleser fungerer. */
function formaterAccessDato(iso: string | null | undefined) {
  const treff = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return treff ? `${treff[3]}.${treff[2]}.${treff[1]}` : (iso ?? "–");
}

/**
 * Backend legger lederens egne saker først. Hver gruppe får sin egen radgruppe (`tbody`), slik at overskriften
 * «Dine saker» eller «Andre saker» bare omfatter radene under seg i tabellsemantikken. Andre enn ledere får én gruppe uten overskrift.
 */
function delIGrupper(kandidater: MigreringKandidat[], egenNavIdent: string | undefined) {
  if (!egenNavIdent) return [{ overskrift: null, kandidater }];
  const egne = kandidater.filter((k) => k.ansvar.navIdent === egenNavIdent);
  const andres = kandidater.filter((k) => k.ansvar.navIdent !== egenNavIdent);
  return [
    ...(egne.length > 0 ? [{ overskrift: "Dine saker", kandidater: egne }] : []),
    ...(andres.length > 0 ? [{ overskrift: "Andre saker", kandidater: andres }] : []),
  ];
}

function klikkRad(event: MouseEvent<HTMLTableRowElement>) {
  if ((event.target as HTMLElement).closest("a, button, input, select")) return;
  event.currentTarget
    .querySelector<HTMLElement>("a[href], button[type='submit'], button[data-rad-handling]")
    ?.click();
}

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const { erLeder } = lister;

  return (
    <div className="mt-4 mb-8 flex flex-col gap-6">
      <Heading level="1" size="large">
        <HStack gap="space-8" align="center" as="span">
          <InboxDownIcon aria-hidden />
          Flytt fra Access
        </HStack>
      </Heading>
      <HGrid columns={{ xs: 1, lg: "minmax(0, 1fr) 280px" }} gap="space-24">
        <div className="flex min-w-0 flex-col gap-6 lg:order-1 order-2">
          {lister.utilgjengelig && (
            <Alert variant="warning" size="small">
              Vi fikk ikke hentet hele listen. Det kan mangle saker. Prøv igjen om litt.
            </Alert>
          )}
          <Box background="info-soft" borderRadius="8" padding="space-16">
            <VStack gap="space-4">
              <Heading level="2" size="xsmall">
                Flytt saker fra Access til Watson Sak
              </Heading>
              <BodyShort size="small">
                Opprett sak for hver person, og flytt over alle filer fra S: og all informasjon fra
                Access.{" "}
                {erLeder
                  ? "Som leder kan du filtrere på avdeling, saksbehandler og status – og tildele saker til andre."
                  : "Her ser du dine egne saker."}
              </BodyShort>
            </VStack>
          </Box>
          <Kandidatliste
            side={lister.liste}
            erLeder={erLeder}
            egenNavIdent={lister.egenNavIdent}
            ansatteValg={lister.ansatteValg}
          />
        </div>
        <Filterpanel lister={lister} />
      </HGrid>
    </div>
  );
}

function StatusTag({ kandidat }: { kandidat: Pick<MigreringKandidat, "migreringsstatus"> }) {
  const status = hentMigreringsstatus(kandidat);
  return (
    <Tag variant="moderate" data-color={STATUSFARGE[status]} size="small">
      {statusEtikett[status]}
    </Tag>
  );
}

function Kandidatliste({
  side,
  erLeder,
  egenNavIdent,
  ansatteValg,
}: {
  side: MigreringSide;
  erLeder: boolean;
  egenNavIdent?: string;
  ansatteValg: MigreringAnsatt[];
}) {
  const [endrer, setEndrer] = useState<MigreringKandidat | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">PID</Table.HeaderCell>
              <Table.HeaderCell scope="col">Fødsels- eller d-nummer</Table.HeaderCell>
              <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
              <Table.HeaderCell scope="col">Status</Table.HeaderCell>
              {erLeder && (
                <>
                  <Table.HeaderCell scope="col">Saksbehandler</Table.HeaderCell>
                  <Table.HeaderCell scope="col">
                    <span className="sr-only">Handling</span>
                  </Table.HeaderCell>
                </>
              )}
            </Table.Row>
          </Table.Header>
          {delIGrupper(side.kandidater, erLeder ? egenNavIdent : undefined).map((gruppe) => (
            <Table.Body key={gruppe.overskrift ?? "alle"}>
              {gruppe.overskrift && (
                <Table.Row>
                  <Table.HeaderCell scope="rowgroup" colSpan={6} className="bg-ax-bg-neutral-soft">
                    {gruppe.overskrift}
                  </Table.HeaderCell>
                </Table.Row>
              )}
              {gruppe.kandidater.map((k) => (
                <Fragment key={`${k.kilde}:${k.legacyPid}`}>
                  <Table.Row
                    onClick={klikkRad}
                    className="cursor-pointer hover:bg-ax-bg-neutral-soft"
                  >
                    <Table.DataCell>
                      <KandidatLenke kandidat={k} />
                    </Table.DataCell>
                    <Table.DataCell>
                      {k.ansvar.type === "BEKREFTET" && k.personIdent
                        ? formaterFødselsnummer(k.personIdent)
                        : "–"}
                    </Table.DataCell>
                    <Table.DataCell>{formaterAccessDato(k.referansedato)}</Table.DataCell>
                    <Table.DataCell>
                      <StatusTag kandidat={k} />
                    </Table.DataCell>
                    {erLeder && (
                      <>
                        <Table.DataCell>
                          {k.ansvarligNavn ?? k.ansvar.navIdent ?? "–"}
                        </Table.DataCell>
                        <Table.DataCell>
                          {hentMigreringsstatus(k) === "IKKE_PABEGYNT" &&
                            ansatteValg.some((a) => a.navIdent !== k.ansvar.navIdent) && (
                              <Button
                                type="button"
                                data-rad-handling
                                variant="secondary"
                                size="small"
                                aria-label={`Endre tildeling for PID ${k.legacyPid}`}
                                onClick={() => setEndrer(k)}
                              >
                                Endre tildeling
                              </Button>
                            )}
                        </Table.DataCell>
                      </>
                    )}
                  </Table.Row>
                </Fragment>
              ))}
            </Table.Body>
          ))}
        </Table>
      </div>
      {side.totalAntall === 0 && (
        <BodyShort size="small" textColor="subtle">
          Ingen saker å vise.
        </BodyShort>
      )}
      <Sidevelger side={side} />
      {endrer && (
        <EndreTildelingModal
          kandidat={endrer}
          ansatteValg={ansatteValg}
          onLukk={() => setEndrer(null)}
        />
      )}
    </>
  );
}

/** PID er inngangen til raden: åpner saken hvis den finnes, ellers starter flyttingen. */
function KandidatLenke({ kandidat: k }: { kandidat: MigreringKandidat }) {
  if (k.alleredeMigrertTilKontrollsakId) {
    return (
      <Link
        className="text-ax-text-neutral no-underline hover:underline"
        to={RouteConfig.SAKER_DETALJ.replace(
          ":sakId",
          getSaksreferanse(k.alleredeMigrertTilKontrollsakId),
        )}
      >
        {k.legacyPid}
      </Link>
    );
  }
  // Andres saker har ikke personident, og lederen kan ikke starte flyttingen for dem.
  if (k.ansvar.type !== "BEKREFTET" || !k.personIdent) return <span>{k.legacyPid}</span>;
  return (
    <Form
      method="post"
      action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}
      onSubmit={() => sporHendelse("migrering opprett sak klikket", { kategori: k.kategori })}
    >
      <input type="hidden" name="legacyPid" value={k.legacyPid} />
      <input type="hidden" name="legacyKilde" value={k.legacyKilde} />
      <input type="hidden" name="fnr" value={k.personIdent} />
      <button
        type="submit"
        className="cursor-pointer border-0 bg-transparent p-0 text-inherit hover:underline"
        aria-label={`Flytt sak med PID ${k.legacyPid} fra Access`}
      >
        {k.legacyPid}
      </button>
    </Form>
  );
}

function EndreTildelingModal({
  kandidat,
  ansatteValg,
  onLukk,
}: {
  kandidat: MigreringKandidat;
  ansatteValg: MigreringAnsatt[];
  onLukk: () => void;
}) {
  const fetcher = useFetcher<TildelingsSvar>();
  const ref = useRef<HTMLDialogElement>(null);
  const valg = ansatteValg.filter((a) => a.navIdent !== kandidat.ansvar.navIdent);
  const sender = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onLukk();
  }, [fetcher.state, fetcher.data, onLukk]);

  return (
    <Modal
      ref={ref}
      open
      onClose={onLukk}
      header={{ heading: `Endre tildeling for PID ${kandidat.legacyPid}` }}
      width="small"
    >
      <fetcher.Form method="post">
        <Modal.Body>
          <VStack gap="space-16">
            <input type="hidden" name="kandidatId" value={kandidat.kandidatId} />
            <Select label="Ny saksbehandler" name="navIdent" defaultValue="">
              <option value="" disabled>
                Velg saksbehandler
              </option>
              {valg.map((a) => (
                <option key={a.navIdent} value={a.navIdent}>
                  {a.navn}
                </option>
              ))}
            </Select>
            {erTekniskFeilSvar(fetcher.data) ? (
              <Innsendingsfeil svar={fetcher.data} tittel="Vi fikk ikke tildelt saken">
                Sjekk om saken er tildelt før du prøver igjen.
              </Innsendingsfeil>
            ) : (
              fetcher.data &&
              !fetcher.data.ok && (
                <Alert variant="error" size="small">
                  {fetcher.data.feil}
                </Alert>
              )
            )}
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" loading={sender}>
            Lagre
          </Button>
          <Button type="button" variant="tertiary" onClick={onLukk}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}

function Filterpanel({ lister }: { lister: MigreringLister }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter, erLeder, ansatteValg } = lister;

  function oppdater(endre: (neste: URLSearchParams) => void) {
    const neste = new URLSearchParams(searchParams);
    endre(neste);
    // Nytt filter gir nytt antall sider, så listen starter på side 1.
    neste.delete("side");
    setSearchParams(neste, { preventScrollReset: true });
  }

  function settVerdi(navn: string, verdi: string) {
    oppdater((neste) => (verdi ? neste.set(navn, verdi) : neste.delete(navn)));
  }

  function veksleStatus(status: Migreringsstatus) {
    oppdater((neste) => {
      const valgt = new Set(filter.status);
      if (valgt.has(status)) valgt.delete(status);
      else valgt.add(status);
      neste.delete("status");
      for (const s of MIGRERINGSSTATUSER) if (valgt.has(s)) neste.append("status", s);
    });
  }

  const enheter = [
    ...new Map(ansatteValg.map((a) => [a.enhetId, a.enhetNavn ?? a.enhetId])).entries(),
  ];
  const saksbehandlere = ansatteValg.filter((a) => !filter.enhet || a.enhetId === filter.enhet);

  return (
    <VStack gap="space-16" className="lg:order-2 order-1" align="stretch">
      {erLeder && (
        <>
          <Select
            label="Avdeling"
            size="small"
            value={filter.enhet ?? ""}
            onChange={(event) => settVerdi("enhet", event.target.value)}
          >
            <option value="">Alle</option>
            {enheter.map(([id, navn]) => (
              <option key={id} value={id}>
                {navn}
              </option>
            ))}
          </Select>
          <Select
            label="Saksbehandler"
            size="small"
            value={filter.ansvarlig ?? ""}
            onChange={(event) => settVerdi("ansvarlig", event.target.value)}
          >
            <option value="">Alle</option>
            {saksbehandlere.map((a) => (
              <option key={a.navIdent} value={a.navIdent}>
                {a.navn}
              </option>
            ))}
          </Select>
        </>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">Status</legend>
        <Chips>
          {MIGRERINGSSTATUSER.map((status) => (
            <Chips.Toggle
              key={status}
              selected={filter.status.includes(status)}
              onClick={() => veksleStatus(status)}
            >
              {statusEtikett[status]}
            </Chips.Toggle>
          ))}
        </Chips>
      </fieldset>
    </VStack>
  );
}

/**
 * Sidenavigasjon med Aksel sin `Pagination`. Sidenummeret ligger i URL-en, så en side kan
 * lenkes til og lastes på nytt.
 */
function Sidevelger({ side }: { side: MigreringSide }) {
  const [searchParams, setSearchParams] = useSearchParams();
  if (side.totalAntall === 0) return null;

  const fra = (side.side - 1) * MIGRERING_SIDESTORRELSE + 1;
  const til = fra + side.kandidater.length - 1;

  function gåTilSide(ny: number) {
    const neste = new URLSearchParams(searchParams);
    if (ny <= 1) {
      neste.delete("side");
    } else {
      neste.set("side", String(ny));
    }
    setSearchParams(neste, { preventScrollReset: true });
  }

  return (
    <HStack justify="space-between" align="center" gap="space-16" wrap>
      <BodyShort size="small" textColor="subtle">
        Viser {fra}–{til} av {side.totalAntall}
      </BodyShort>
      {side.totalSider > 1 && (
        <Pagination
          page={side.side}
          onPageChange={gåTilSide}
          count={side.totalSider}
          size="small"
        />
      )}
    </HStack>
  );
}
