import { FilePlusIcon, FileTextIcon } from "@navikt/aksel-icons";
import { ActionMenu, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import { MAL_NAVN, type MalId } from "~/saker/filer/dokument/maler";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "./DokumentTre";
import type { DokumentNode, FilResponse } from "./typer";
import { VedleggSeksjon } from "./VedleggSeksjon";

const MAL_IDER = Object.keys(MAL_NAVN) as MalId[];

function OpprettDokumentKnapp({
  sakId,
  size,
  variant = "secondary",
}: {
  sakId: string;
  size: "small" | "xsmall";
  variant?: "secondary" | "tertiary";
}) {
  const action = RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId);
  const fetcher = useFetcher();

  function opprett(valg?: { malId: MalId; erStraffesak: boolean }) {
    sporHendelse("dokument opprettet", { sakId, malId: valg?.malId ?? "tom" });
    const formData = new FormData();
    if (valg) {
      formData.set("malId", valg.malId);
      formData.set("erStraffesak", String(valg.erStraffesak));
    }
    fetcher.submit(formData, { method: "post", action });
  }

  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button size={size} variant={variant} icon={<FilePlusIcon aria-hidden />}>
          Opprett dokument
        </Button>
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        <ActionMenu.Item icon={<FilePlusIcon aria-hidden />} onSelect={() => opprett()}>
          Tomt dokument
        </ActionMenu.Item>
        <ActionMenu.Divider />
        <ActionMenu.Group label="Fra mal">
          {MAL_IDER.map((malId) => (
            <ActionMenu.Sub key={malId}>
              <ActionMenu.SubTrigger icon={<FileTextIcon aria-hidden />}>
                {MAL_NAVN[malId]}
              </ActionMenu.SubTrigger>
              <ActionMenu.SubContent>
                <ActionMenu.Item onSelect={() => opprett({ malId, erStraffesak: false })}>
                  Ikke straffesak
                </ActionMenu.Item>
                <ActionMenu.Item onSelect={() => opprett({ malId, erStraffesak: true })}>
                  Straffesak
                </ActionMenu.Item>
              </ActionMenu.SubContent>
            </ActionMenu.Sub>
          ))}
        </ActionMenu.Group>
      </ActionMenu.Content>
    </ActionMenu>
  );
}

interface SakFilområdeProps {
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
  /** Om innlogget bruker er sakseier og kan slette vedlegg. Standard: `false` */
  erSakseier?: boolean;
}

export function SakFilområde({
  dokumenter,
  filer,
  sakId,
  redigerbar = true,
  erSakseier = false,
}: SakFilområdeProps) {
  return (
    <Kort>
      <VStack gap="space-8">
        <div>
          <HStack justify="space-between" align="center" className="mb-4">
            <Heading level="2" size="small">
              Dokumenter
            </Heading>
            {redigerbar && <OpprettDokumentKnapp sakId={sakId} size="xsmall" variant="tertiary" />}
          </HStack>
          <DokumentTre noder={dokumenter} sakId={sakId} redigerbar={redigerbar} />
        </div>

        <div className="border-t border-ax-border-neutral-subtle pt-6">
          <VedleggSeksjon
            filer={filer}
            sakId={sakId}
            erSakseier={erSakseier}
            kanLasteOpp={redigerbar}
          />
        </div>
      </VStack>
    </Kort>
  );
}
