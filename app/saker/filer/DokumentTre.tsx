import { FilePdfIcon, MenuElipsisVerticalIcon, TrashIcon } from "@navikt/aksel-icons";
import { ActionMenu, BodyShort, Button, Detail } from "@navikt/ds-react";
import { Link } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { DokumentIkon } from "./dokument-ikon";
import { SlettDokumentModal } from "./dokument/SlettDokumentModal";
import { useDokumentSletting } from "./dokument/useDokumentSletting";
import type { DokumentNode } from "./typer";

function DokumentHandlinger({
  dokument,
  sakId,
  redigerbar,
  onSlett,
}: {
  dokument: DokumentNode;
  sakId: string;
  redigerbar: boolean;
  onSlett: (dokument: DokumentNode) => void;
}) {
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          variant="tertiary"
          size="small"
          icon={<MenuElipsisVerticalIcon aria-hidden />}
          aria-label={`Handlinger for ${dokument.tittel || "Uten tittel"}`}
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        <ActionMenu.Item
          icon={<FilePdfIcon aria-hidden />}
          onSelect={() =>
            sporHendelse("dokument lastet ned", { sakId, docId: dokument.id, format: "pdf" })
          }
        >
          Last ned som PDF
        </ActionMenu.Item>
        {redigerbar && (
          <>
            <ActionMenu.Divider />
            <ActionMenu.Item
              variant="danger"
              icon={<TrashIcon aria-hidden />}
              onSelect={() => onSlett(dokument)}
            >
              Slett
            </ActionMenu.Item>
          </>
        )}
      </ActionMenu.Content>
    </ActionMenu>
  );
}

function DokumentRad({
  node,
  sakId,
  fremhevetId,
  redigerbar,
  onSlett,
}: {
  node: DokumentNode;
  sakId: string;
  fremhevetId?: string;
  redigerbar: boolean;
  onSlett: (dokument: DokumentNode) => void;
}) {
  const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
    ":docId",
    node.id,
  );
  const erFremhevet = fremhevetId === node.id;

  return (
    <li className="flex items-center gap-2 py-2">
      <Link
        to={dokumentUrl}
        aria-current={erFremhevet ? "page" : undefined}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 no-underline transition-colors text-ax-text-default ${
          erFremhevet ? "bg-ax-bg-neutral-moderate-hover" : "hover:bg-ax-bg-neutral-moderate-hover"
        }`}
      >
        <DokumentIkon aria-hidden className="shrink-0 text-ax-icon-info" />
        <BodyShort
          size="small"
          weight={erFremhevet ? "semibold" : "regular"}
          className="truncate flex-1"
        >
          {node.tittel || "Uten tittel"}
        </BodyShort>
        <Detail className="shrink-0 whitespace-nowrap text-ax-text-neutral-subtle">
          {formaterDato(node.endretDato)} – {node.endretAv}
        </Detail>
      </Link>
      <div className="shrink-0">
        <DokumentHandlinger
          dokument={node}
          sakId={sakId}
          redigerbar={redigerbar}
          onSlett={onSlett}
        />
      </div>
    </li>
  );
}

export function DokumentTre({
  noder,
  sakId,
  redigerbar = false,
  fremhevetId,
  redirectVedSletting,
}: {
  noder: DokumentNode[];
  sakId: string;
  redigerbar?: boolean;
  fremhevetId?: string;
  redirectVedSletting?: (docId: string) => string | undefined;
}) {
  const sletting = useDokumentSletting({
    sakId,
    kilde: "dokumentliste",
    redirectTo: redirectVedSletting,
  });

  return (
    <>
      <ul className="flex flex-col" aria-label="Dokumenter">
        {noder.map((node) => (
          <DokumentRad
            key={node.id}
            node={node}
            sakId={sakId}
            fremhevetId={fremhevetId}
            redigerbar={redigerbar}
            onSlett={sletting.start}
          />
        ))}
      </ul>

      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </>
  );
}
