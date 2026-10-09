import type { FetcherWithComponents } from "react-router";
import { BodyShort, Button, HStack, LocalAlert, Loader, VStack } from "@navikt/ds-react";
import { MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { Link } from "react-router";
import { FødselsnummerSøkefelt } from "~/formaterte-inputfelt/FormaterteInputfelt";
import { RouteConfig } from "~/routeConfig";
import { INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING } from "./feilmeldinger";
import type { PersonOppslagResultat } from "./person-oppslag.mock.server";

type Person = PersonOppslagResultat["person"];
type EksisterendeSak = PersonOppslagResultat["eksisterendeSaker"][number];

type PersonFetcherData =
  | PersonOppslagResultat
  | { person: null; eksisterendeSaker: [] }
  | { feil: string };

type Props = {
  personFetcher: FetcherWithComponents<PersonFetcherData>;
  søkeFnr: string;
  setSøkeFnr: (value: string) => void;
  lasterPerson: boolean;
  harSøkt: boolean;
  oppslagFeil: string | null | undefined;
  person: Person | null;
  søktMedHistoriskIdent: boolean;
  legacyPid?: string;
  skjemaSperret: boolean;
  sisteSak: EksisterendeSak | undefined;
  formaterDato: (iso: string) => string;
  onPersonOppslag: () => void;
  children: React.ReactNode;
};

function PersonkortIkon() {
  return (
    <svg
      aria-hidden
      className="shrink-0"
      fill="none"
      focusable="false"
      height="24"
      viewBox="0 0 24 24"
      width="24"
    >
      <circle cx="12" cy="12" className="fill-ax-bg-info-strong" r="12" />
      <path
        d="M4.06152 3.30859L4.96387 3.31543C6.21626 3.38517 7.57007 4.3105 7.57031 5.58008C7.56956 5.63708 7.56934 5.81577 7.56934 5.84277V9.89258C7.56909 10.219 7.27804 10.4824 6.91895 10.4824C6.55964 10.4822 6.2688 10.2189 6.26855 9.89258V6.53516C6.26835 6.38308 6.14468 6.25977 5.99219 6.25977C5.84643 6.25983 5.72992 6.37347 5.71973 6.5166C5.71785 6.52373 5.71191 6.52863 5.71191 6.53613V17.2109C5.71191 17.668 5.34247 18.0381 4.88574 18.0381C4.42899 18.0381 4.05762 17.6677 4.05762 17.2109V10.4434C4.05759 10.2935 3.93605 10.1715 3.78516 10.1709C3.63367 10.1709 3.51175 10.2934 3.51172 10.4434V17.2109C3.51157 17.6679 3.14063 18.0381 2.68359 18.0381C2.22698 18.038 1.85757 17.6675 1.85742 17.2109V6.53516C1.85722 6.52796 1.85118 6.52311 1.84961 6.5166C1.83949 6.37338 1.72299 6.25883 1.57715 6.25879C1.4249 6.25879 1.30079 6.38253 1.30078 6.53516V9.8916C1.30078 10.2181 1.00987 10.4823 0.650391 10.4824C0.290766 10.4824 0 10.2182 0 9.8916V5.58008C0.000238766 4.3105 1.35368 3.38555 2.60645 3.31543L3.50879 3.30859V3.30566L3.78516 3.30762L4.06152 3.30566V3.30859ZM3.78418 0C4.58617 0 5.23806 0.649835 5.23828 1.45215C5.23828 2.25465 4.58593 2.90527 3.78418 2.90527C2.98212 2.9052 2.33203 2.25423 2.33203 1.45215C2.33225 0.650255 2.98225 7.3021e-05 3.78418 0Z"
        className="fill-ax-text-info-contrast"
        transform="translate(8.215 2.981)"
      />
    </svg>
  );
}

export function PersonOppslag({
  personFetcher,
  søkeFnr,
  setSøkeFnr,
  lasterPerson,
  harSøkt,
  oppslagFeil,
  person,
  søktMedHistoriskIdent,
  legacyPid,
  skjemaSperret,
  sisteSak,
  formaterDato,
  onPersonOppslag,
  children,
}: Props) {
  return (
    <>
      {/* Personoppslag */}
      <personFetcher.Form
        method="post"
        action={RouteConfig.API.PERSON_OPPSLAG}
        aria-label="Søk etter person"
        className="mb-6"
        onSubmit={onPersonOppslag}
      >
        <FødselsnummerSøkefelt
          label="Fødsels- eller d-nummer"
          hideLabel={false}
          name="fnr"
          value={søkeFnr}
          onChange={setSøkeFnr}
          onClear={() => setSøkeFnr("")}
          htmlSize={20}
          autoComplete="off"
          inputMode="numeric"
          disabled={lasterPerson}
        >
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={lasterPerson}
            aria-label={lasterPerson ? "Søker..." : "Søk"}
            icon={
              lasterPerson ? (
                <Loader size="xsmall" title="Søker..." />
              ) : (
                <MagnifyingGlassIcon aria-hidden />
              )
            }
            className="aksel-search__button-search"
          />
        </FødselsnummerSøkefelt>
      </personFetcher.Form>

      {/* Feil fra personoppslag */}
      {harSøkt && oppslagFeil && (
        <LocalAlert status="announcement" className="max-w-xl">
          <LocalAlert.Header>
            <LocalAlert.Title as="h2">Feil ved personoppslag</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>{oppslagFeil}</LocalAlert.Content>
        </LocalAlert>
      )}

      {/* Person ikke funnet */}
      {harSøkt && !person && !oppslagFeil && (
        <LocalAlert status="announcement" className="max-w-xl">
          <LocalAlert.Header>
            <LocalAlert.Title as="h2">Personen ble ikke funnet</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>Sjekk at fødselsnummeret er riktig.</LocalAlert.Content>
        </LocalAlert>
      )}

      {/* Person funnet */}
      {person && (
        <VStack gap="space-32">
          <VStack
            aria-label="Personinformasjon"
            className="max-w-[472px] rounded-lg border-l-4 border-ax-border-info bg-ax-bg-info-soft px-6 py-3.5"
            gap="space-12"
          >
            <HStack align="center" gap="space-16">
              <PersonkortIkon />
              <VStack gap="space-0">
                <span className="text-[11px] font-semibold tracking-[0.6px] text-ax-text-info-subtle">
                  SAKEN OPPRETTES PÅ
                </span>
                <BodyShort size="medium" className="font-bold">
                  {person.navn}
                </BodyShort>
                <BodyShort size="small" className="text-ax-text-neutral-subtle">
                  Personnummer: {person.personnummer} · {person.alder} år
                  {legacyPid && ` · PID: ${legacyPid}`}
                </BodyShort>
              </VStack>
            </HStack>
            {søktMedHistoriskIdent && (
              <LocalAlert status="warning">
                <LocalAlert.Content>
                  Fødsels- eller d-nummeret du søkte med er historisk. Saken opprettes på gjeldende
                  identifikator: <strong>{person.personnummer}</strong>.
                </LocalAlert.Content>
              </LocalAlert>
            )}
            {person.adresseskjermet && (
              <LocalAlert status="warning">
                <LocalAlert.Content>Denne personen er skjermet.</LocalAlert.Content>
              </LocalAlert>
            )}
          </VStack>

          {/* Skjema sperret: saksbehandler mangler Utvidet tilgang til skjermet person.
              Skjemaet rendres bevisst ikke i det hele tatt — se RAILS-9. */}
          {skjemaSperret && (
            <LocalAlert status="warning" className="max-w-2xl">
              <LocalAlert.Header>
                <LocalAlert.Title as="h2">
                  Du kan ikke opprette sak på denne personen
                </LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                {INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING}. Ta kontakt dersom du mener dette er
                feil.
              </LocalAlert.Content>
            </LocalAlert>
          )}

          {/* Eksisterende sak-advarsel (info, ikke-blokkerende) */}
          {sisteSak && (
            <LocalAlert status="announcement" className="max-w-2xl">
              <LocalAlert.Header>
                <LocalAlert.Title as="h2">
                  Det er allerede registrert en sak på personen
                </LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <VStack gap="space-12">
                  <BodyShort>
                    {formaterDato(sisteSak.opprettetDato)} ble det opprettet en sak på{" "}
                    {sisteSak.personNavn}. Kanskje gjelder dette samme sak?
                  </BodyShort>
                  {sisteSak.sakId ? (
                    <HStack gap="space-8">
                      <Button
                        as={Link}
                        to={RouteConfig.SAKER_DETALJ.replace(":sakId", sisteSak.sakId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="secondary"
                        size="small"
                      >
                        Se sak <span className="sr-only">(åpnes i ny fane)</span>
                      </Button>
                    </HStack>
                  ) : null}
                </VStack>
              </LocalAlert.Content>
            </LocalAlert>
          )}

          {/* Skjema — rendres kun når saksbehandler har rett til å opprette sak.
              For skjermet person uten Utvidet tilgang sperres skjemaet proaktivt
              ved at det ikke rendres i det hele tatt, se RAILS-9. */}
          {!skjemaSperret && children}
        </VStack>
      )}
    </>
  );
}
