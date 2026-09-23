import {
  Alert,
  BodyShort,
  Button,
  Heading,
  Search,
  Select,
  Table,
  Tabs,
  Tag,
} from "@navikt/ds-react";
import { useState } from "react";
import { MigreringGrunnlagModal } from "./MigreringGrunnlagModal";
import { MigreringsAvklaringer } from "./MigreringsAvklaringer";
import {
  kildeEtikett,
  vurderingEtikett,
  type MigreringKandidat,
  type MigreringLister,
} from "./types";

function Kandidatliste({
  kandidater,
  onVisGrunnlag,
}: {
  kandidater: MigreringKandidat[];
  onVisGrunnlag: (kandidat: MigreringKandidat) => void;
}) {
  const [søk, setSøk] = useState("");
  const [vurdering, setVurdering] = useState("ALLE");
  const søkeord = søk.trim().toLocaleLowerCase("nb-NO");
  const filtrerte = kandidater.filter(
    (k) =>
      (vurdering === "ALLE" || k.vurdering === vurdering) &&
      `${k.pid} ${k.navn} ${kildeEtikett[k.kilde]} ${k.fase}`
        .toLocaleLowerCase("nb-NO")
        .includes(søkeord),
  );

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-md">
          <Search
            label="Søk i mocklisten på PID, navn, kilde eller fase"
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
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Fase / kildestatus</Table.HeaderCell>
              <Table.HeaderCell scope="col">Foreløpig vurdering</Table.HeaderCell>
              <Table.HeaderCell scope="col">Handling</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtrerte.length === 0 ? (
              <Table.Row>
                <Table.DataCell colSpan={5}>
                  Ingen eksempler funnet. Prøv et annet søk eller filter.
                </Table.DataCell>
              </Table.Row>
            ) : (
              filtrerte.map((k) => (
                <Table.Row key={`${k.kilde}:${k.pid}`}>
                  <Table.HeaderCell scope="row">
                    <BodyShort size="small">{kildeEtikett[k.kilde]}</BodyShort>
                    {k.pid}
                  </Table.HeaderCell>
                  <Table.DataCell>{k.navn}</Table.DataCell>
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
                        aria-label={`Se grunnlag for ${k.navn}, ${kildeEtikett[k.kilde]}, PID ${k.pid}`}
                        onClick={() => onVisGrunnlag(k)}
                      >
                        Se grunnlag
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="tertiary"
                        disabled
                        aria-describedby="migrering-opprettelse-sperret"
                      >
                        Opprett sak
                      </Button>
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
  const [aktivFane, setAktivFane] = useState("mine");
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
      <BodyShort id="migrering-opprettelse-sperret">
        Opprettelse er sperret til migreringskoblingen og reglene er klare. Bruk «Se grunnlag» for å
        undersøke eksemplene. «Opprettet i Access» vises ikke før betydningen av datoen er avklart.
      </BodyShort>
      <MigreringsAvklaringer />
      <Tabs value={aktivFane} onChange={setAktivFane}>
        <Tabs.List>
          <Tabs.Tab value="mine" label={`Mine saker (${lister.mine.length})`} />
          <Tabs.Tab
            value="ukjent"
            label={`Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`}
          />
        </Tabs.List>
        <Tabs.Panel value="mine">
          {aktivFane === "mine" && (
            <>
              <BodyShort size="small" className="pt-4">
                Ansvar er simulert som bekreftet for innlogget bruker. Tallene i fanene teller bare
                mockeksempler.
              </BodyShort>
              <Kandidatliste kandidater={lister.mine} onVisGrunnlag={setValgt} />
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="ukjent">
          {aktivFane === "ukjent" && (
            <>
              <BodyShort className="pt-4">
                Ukjent ansvar betyr ikke ufordelt sak. Søkeloggtreff bekrefter ikke eierskap.
                Tilgang til en slik liste med ekte data må avklares og håndheves i backend.
              </BodyShort>
              <Kandidatliste kandidater={lister.utenBekreftetAnsvarlig} onVisGrunnlag={setValgt} />
            </>
          )}
        </Tabs.Panel>
      </Tabs>
      <MigreringGrunnlagModal kandidat={valgt} onClose={() => setValgt(null)} />
    </div>
  );
}
