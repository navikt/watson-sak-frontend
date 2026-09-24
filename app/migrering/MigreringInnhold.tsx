import {
  Alert,
  BodyShort,
  Button,
  Chips,
  Heading,
  Search,
  Select,
  Table,
  Tabs,
  Tag,
} from "@navikt/ds-react";
import { useState } from "react";
import { Form } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { sporHendelse } from "~/analytics/analytics";
import { MigreringGrunnlagModal } from "./MigreringGrunnlagModal";
import { MigreringsAvklaringer } from "./MigreringsAvklaringer";
import {
  kategoriEtikett,
  kildeEtikett,
  vurderingEtikett,
  type MigreringKandidat,
  type MigreringKategori,
  type MigreringLister,
} from "./types";

const alleKategorier: MigreringKategori[] = [
  "TIPS_RESTANSE",
  "TIPS_VENTER_RESULTAT",
  "SV_RESTANSE",
  "SV_VENTER_RESULTAT",
  "REGISTER_DAGPENGER",
  "REGISTER_AAP",
];

function Kandidatliste({
  kandidater,
  valgtKategori,
  onVelgKategori,
  visEnhetOgKilde,
  onVisGrunnlag,
}: {
  kandidater: MigreringKandidat[];
  valgtKategori: MigreringKategori | "ALLE";
  onVelgKategori: (kategori: MigreringKategori | "ALLE") => void;
  visEnhetOgKilde?: boolean;
  onVisGrunnlag: (kandidat: MigreringKandidat) => void;
}) {
  const [søk, setSøk] = useState("");
  const [vurdering, setVurdering] = useState("ALLE");
  const søkeord = søk.trim().toLocaleLowerCase("nb-NO");

  // Beregn antall per kategori for aktiv kandidatliste
  const antallPerKat = alleKategorier.reduce<Record<string, number>>((acc, kat) => {
    acc[kat] = kandidater.filter((k) => k.kategori === kat).length;
    return acc;
  }, {});

  const filtrerte = kandidater.filter((k) => {
    if (valgtKategori !== "ALLE" && k.kategori !== valgtKategori) {
      return false;
    }
    if (vurdering !== "ALLE" && k.vurdering !== vurdering) {
      return false;
    }
    if (søkeord) {
      const matchTekst =
        `${k.legacyPid} ${k.pid} ${k.navn} ${kildeEtikett[k.kilde]} ${k.fase} ${k.enhet ?? ""}`.toLocaleLowerCase(
          "nb-NO",
        );
      return matchTekst.includes(søkeord);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* 6 Kategorifaner/knapper med antall */}
      <div className="flex flex-col gap-2">
        <BodyShort size="small" weight="semibold">
          Kategorier:
        </BodyShort>
        <Chips size="small">
          <Chips.Toggle selected={valgtKategori === "ALLE"} onClick={() => onVelgKategori("ALLE")}>
            {`Alle (${kandidater.length})`}
          </Chips.Toggle>
          {alleKategorier.map((kat) => (
            <Chips.Toggle
              key={kat}
              selected={valgtKategori === kat}
              onClick={() => onVelgKategori(kat)}
            >
              {`${kategoriEtikett[kat]} (${antallPerKat[kat] ?? 0})`}
            </Chips.Toggle>
          ))}
        </Chips>
      </div>

      <div className="flex flex-wrap items-end gap-4 pt-2">
        <div className="w-full max-w-md">
          <Search
            label="Søk i mocklisten på PID, navn, kilde, enhet eller fase"
            variant="simple"
            value={søk}
            onChange={setSøk}
            onClear={() => setSøk("")}
          />
        </div>
        <Select
          label="Foreløpig vurdering"
          value={vurdering}
          onChange={(e) => setVurdering(e.target.value)}
        >
          <option value="ALLE">Alle vurderinger</option>
          <option value="MULIG_KANDIDAT">Mulig kandidat</option>
          <option value="MA_AVKLARES">Må avklares</option>
        </Select>
      </div>

      <BodyShort size="small" role="status">
        Viser {filtrerte.length} av {kandidater.length} syntetiske eksempler
      </BodyShort>

      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">
            Syntetiske migreringseksempler med foreløpig vurdering
          </caption>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Kilde / PID</Table.HeaderCell>
              {visEnhetOgKilde && <Table.HeaderCell scope="col">Enhet</Table.HeaderCell>}
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Fase / kildestatus</Table.HeaderCell>
              <Table.HeaderCell scope="col">Foreløpig vurdering</Table.HeaderCell>
              <Table.HeaderCell scope="col">Handling</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtrerte.length === 0 ? (
              <Table.Row>
                <Table.DataCell colSpan={visEnhetOgKilde ? 6 : 5}>
                  Ingen eksempler funnet. Prøv et annet søk eller filter.
                </Table.DataCell>
              </Table.Row>
            ) : (
              filtrerte.map((k) => (
                <Table.Row key={`${k.kilde}:${k.legacyPid}`}>
                  <Table.HeaderCell scope="row">
                    <BodyShort size="small">{kildeEtikett[k.kilde]}</BodyShort>
                    {k.legacyPid}
                  </Table.HeaderCell>
                  {visEnhetOgKilde && (
                    <Table.DataCell>
                      <BodyShort size="small">{k.enhet ?? "–"}</BodyShort>
                    </Table.DataCell>
                  )}
                  <Table.DataCell>
                    <div>{k.navn}</div>
                    {k.ekskluderFraStatistikk && (
                      <Tag variant="neutral" size="xsmall" className="mt-1">
                        Arbeidsgiveranmeldelse – holdes utenfor statistikk
                      </Tag>
                    )}
                  </Table.DataCell>
                  <Table.DataCell>
                    <BodyShort>{k.fase}</BodyShort>
                    {k.ansvar.type !== "BEKREFTET" && (
                      <BodyShort size="small" textColor="subtle">
                        {k.ansvar.type === "LOGGTREFF"
                          ? "Kun søkeloggtreff – ansvar ubekreftet"
                          : "Ansvar ubekreftet"}
                      </BodyShort>
                    )}
                  </Table.DataCell>
                  <Table.DataCell>
                    <Tag variant={k.vurdering === "MA_AVKLARES" ? "warning" : "info"} size="small">
                      {vurderingEtikett[k.vurdering]}
                    </Tag>
                  </Table.DataCell>
                  <Table.DataCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        aria-label={`Se grunnlag for ${k.navn}, ${kildeEtikett[k.kilde]}, PID ${k.legacyPid}`}
                        onClick={() => onVisGrunnlag(k)}
                      >
                        Se grunnlag
                      </Button>
                      <Form
                        method="post"
                        action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}
                        onSubmit={() =>
                          sporHendelse("migrering opprett sak klikket", { kategori: k.kategori })
                        }
                      >
                        <input type="hidden" name="legacyPid" value={k.legacyPid} />
                        <input type="hidden" name="legacyKilde" value={k.legacyKilde} />
                        <Button
                          type="submit"
                          size="small"
                          variant="tertiary"
                          disabled={k.ansvar.type !== "BEKREFTET"}
                          aria-describedby={
                            k.ansvar.type !== "BEKREFTET"
                              ? "migrering-opprettelse-krever-ansvar"
                              : "migrering-opprettelse-info"
                          }
                        >
                          Opprett sak
                        </Button>
                      </Form>
                    </div>
                  </Table.DataCell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const [aktivVisning, setAktivVisning] = useState<"mine" | "ukjent">("mine");
  const [valgtKategori, setValgtKategori] = useState<MigreringKategori | "ALLE">("ALLE");
  const [valgt, setValgt] = useState<MigreringKandidat | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Heading level="1" size="large">
        Migrering
      </Heading>
      <Alert variant="info">
        <BodyShort weight="semibold">Prototype – kun syntetiske eksempler</BodyShort>
        <BodyShort>Vurderingene er foreløpige. Ingen ekte saker hentes eller overføres.</BodyShort>
      </Alert>
      <BodyShort id="migrering-opprettelse-info">
        «Opprett sak» sender bare kilde og PID videre — migreringslisten viser aldri fødselsnummer,
        så du må slå opp personen manuelt på /registrer-sak. «Opprettet i Access» vises ikke før
        betydningen av datoen er avklart.
      </BodyShort>
      <BodyShort id="migrering-opprettelse-krever-ansvar" size="small" textColor="subtle">
        Opprettelse krever bekreftet ansvar. Kandidater som bare er synlige via enhetstilgang
        («Uten ansvarlig») kan ikke opprettes herfra — se avsnitt 4 og 6 (avklaring H) i
        migreringsnotatet. Fanen «Mine saker» kan opprettes fra.
      </BodyShort>
      <MigreringsAvklaringer />
      <Tabs
        value={aktivVisning}
        onChange={(val) => {
          setAktivVisning(val as "mine" | "ukjent");
          setValgtKategori("ALLE");
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="mine" label={`Mine saker (${lister.mine.length})`} />
          <Tabs.Tab
            value="ukjent"
            label={`Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`}
          />
        </Tabs.List>
        <Tabs.Panel value="mine">
          {aktivVisning === "mine" && (
            <>
              <BodyShort size="small" className="pt-4">
                Ansvar er simulert som bekreftet for innlogget bruker. Tallene i fanene teller bare
                mockeksempler.
              </BodyShort>
              <Kandidatliste
                kandidater={lister.mine}
                valgtKategori={valgtKategori}
                onVelgKategori={setValgtKategori}
                onVisGrunnlag={setValgt}
              />
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="ukjent">
          {aktivVisning === "ukjent" && (
            <>
              <BodyShort className="pt-4">
                Ukjent ansvar betyr ikke ufordelt sak. Søkeloggtreff bekrefter ikke eierskap.
                Kandidater uten saksbehandler vises med kilde og enhet for lokal enhetstilgang.
              </BodyShort>
              <Kandidatliste
                kandidater={lister.utenBekreftetAnsvarlig}
                valgtKategori={valgtKategori}
                onVelgKategori={setValgtKategori}
                visEnhetOgKilde={true}
                onVisGrunnlag={setValgt}
              />
            </>
          )}
        </Tabs.Panel>
      </Tabs>
      <MigreringGrunnlagModal kandidat={valgt} onClose={() => setValgt(null)} />
    </div>
  );
}
