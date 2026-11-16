import { useId } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  Checkbox,
  CheckboxGroup,
  ExpansionCard,
  InfoCard,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { HENLEGGELSESNOTAT_MAKS_LENGDE, type Henleggelsesnotattype } from "~/saker/types.backend";
import { notattypeEtiketter } from "~/saker/visning";
import { NOTATTYPER, type Notatvalg } from "../henleggelsesnotater";

type NotatValgProps = {
  valg: Notatvalg;
  /** Notater som allerede er arkivert i Gosys. De vises som avkrysset og låst. */
  låste: readonly Henleggelsesnotattype[];
  åpneFelt: Record<Henleggelsesnotattype, boolean>;
  feil: Partial<Record<Henleggelsesnotattype, string>>;
  åpen: boolean;
  deaktivert: boolean;
  /** Gir refen til tekstfeltet, slik at fokus kan flyttes dit ved feil. */
  registrerFeltref: (type: Henleggelsesnotattype, element: HTMLTextAreaElement | null) => void;
  onÅpenEndret: (åpen: boolean) => void;
  onValgtEndret: (valgte: Henleggelsesnotattype[]) => void;
  onTekstEndret: (type: Henleggelsesnotattype, tekst: string) => void;
  onFeltÅpnet: (type: Henleggelsesnotattype, åpent: boolean) => void;
};

/** Valg av notattyper under henleggelsesårsaken. Teksten i notatene lagres bare i komponenttilstand. */
export function NotatValg({
  valg,
  låste,
  åpneFelt,
  feil,
  åpen,
  deaktivert,
  registrerFeltref,
  onÅpenEndret,
  onValgtEndret,
  onTekstEndret,
  onFeltÅpnet,
}: NotatValgProps) {
  const id = useId();
  const valgte = NOTATTYPER.filter((type) => valg.valgt[type] || låste.includes(type));
  return (
    <ExpansionCard
      aria-labelledby={`${id}-tittel`}
      size="small"
      open={åpen}
      onToggle={onÅpenEndret}
    >
      <ExpansionCard.Header>
        <ExpansionCard.Title as="h3" size="small" id={`${id}-tittel`}>
          Avslutt med henleggelsesnotat eller orienteringsnotat
        </ExpansionCard.Title>
        <ExpansionCard.Description>
          Registrer type notat. Opprett notatet som et dokument og arkiver i Gosys eller skriv
          notatet her.
        </ExpansionCard.Description>
      </ExpansionCard.Header>
      <ExpansionCard.Content>
        <VStack gap="space-16">
          <CheckboxGroup
            legend="Type notat"
            description="Velg type notat du har eller skal opprette"
            value={valgte}
            onChange={(verdier: Henleggelsesnotattype[]) => onValgtEndret(verdier)}
          >
            {NOTATTYPER.map((type) => {
              const etikett = notattypeEtiketter[type];
              const feltId = `${id}-${type}`;
              const erÅpen = åpneFelt[type];
              if (låste.includes(type)) {
                return (
                  <VStack key={type} gap="space-4" align="start" className="w-full">
                    <Checkbox value={type} disabled>
                      {etikett}
                    </Checkbox>
                    <BodyShort size="small" textColor="subtle" className="pl-8">
                      Arkivert i Gosys
                    </BodyShort>
                  </VStack>
                );
              }
              return (
                <VStack key={type} gap="space-4" align="start" className="w-full">
                  <Checkbox value={type} disabled={deaktivert}>
                    {etikett}
                  </Checkbox>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="xsmall"
                    icon={erÅpen ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
                    aria-expanded={erÅpen}
                    aria-controls={feltId}
                    onClick={() => onFeltÅpnet(type, !erÅpen)}
                  >
                    {erÅpen ? "Lukk" : "Skriv notat"}
                    <span className="sr-only"> for {etikett.toLowerCase()}</span>
                  </Button>
                  <div id={feltId} className="w-full" hidden={!erÅpen}>
                    {erÅpen && (
                      <Textarea
                        id={`${feltId}-tekst`}
                        ref={(element) => registrerFeltref(type, element)}
                        label={`Tekst i ${etikett.toLowerCase()}`}
                        hideLabel
                        description={`Teksten du skriver vil bli arkivert som et dokument i Gosys som «${etikett}»`}
                        value={valg.tekst[type]}
                        maxLength={HENLEGGELSESNOTAT_MAKS_LENGDE}
                        minRows={4}
                        error={feil[type]}
                        readOnly={deaktivert}
                        onChange={(hendelse) => onTekstEndret(type, hendelse.target.value)}
                      />
                    )}
                  </div>
                </VStack>
              );
            })}
          </CheckboxGroup>
          <InfoCard data-color="info" size="small">
            <InfoCard.Header>
              <InfoCard.Title as="h4">Notater opprettet som dokument</InfoCard.Title>
            </InfoCard.Header>
            <InfoCard.Content>
              <BodyShort>Dersom du har laget notatet som et dokument husk å:</BodyShort>
              <ul className="list-disc pl-6">
                <li>Journalføre notatet i Gosys</li>
                <li>Dersom det er et orienteringsnotat opprett en oppgave</li>
              </ul>
            </InfoCard.Content>
          </InfoCard>
        </VStack>
      </ExpansionCard.Content>
    </ExpansionCard>
  );
}
