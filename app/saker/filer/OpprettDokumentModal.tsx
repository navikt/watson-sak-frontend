import { ChevronRightIcon, FileIcon, FileTextIcon, GavelIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HGrid, Loader, Modal, VStack } from "@navikt/ds-react";
import { MAL_NAVN, type MalId } from "./dokument/maler";

const MAL_IDER = Object.keys(MAL_NAVN) as MalId[];

type OpprettDokumentModalProps = {
  åpen: boolean;
  oppretter: boolean;
  onClose: () => void;
  onVelg: (valg?: { malId: MalId; erStraffesak: boolean }) => void;
};

function MalValg({
  malId,
  erStraffesak,
  onVelg,
}: {
  malId: MalId;
  erStraffesak: boolean;
  onVelg: (valg: { malId: MalId; erStraffesak: boolean }) => void;
}) {
  const Ikon = erStraffesak ? GavelIcon : FileTextIcon;
  const sakstype = erStraffesak ? "Straffesak" : "Ikke straffesak";

  return (
    <Button
      type="button"
      variant="secondary"
      data-color="neutral"
      onClick={() => onVelg({ malId, erStraffesak })}
      aria-label={`${MAL_NAVN[malId]} ${sakstype}`}
      className="relative h-[72px] w-full justify-start px-[var(--ax-space-16)] text-left !shadow-[inset_0_0_0_1px_var(--ax-border-neutral-subtle)] hover:!bg-ax-bg-neutral-soft hover:!shadow-[inset_0_0_0_1px_var(--ax-border-neutral-subtle)]"
    >
      <span className="flex min-w-0 items-center gap-[var(--ax-space-12)]">
        <Ikon aria-hidden className="h-7 w-7 shrink-0" />
        <span>
          <BodyShort as="span" size="small" weight="semibold" className="block">
            {MAL_NAVN[malId]}
          </BodyShort>
          <BodyShort as="span" size="small" weight="semibold" textColor="subtle" className="block">
            {sakstype}
          </BodyShort>
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="absolute right-[var(--ax-space-16)] top-1/2 -translate-y-1/2"
      />
    </Button>
  );
}

export function OpprettDokumentModal({
  åpen,
  oppretter,
  onClose,
  onVelg,
}: OpprettDokumentModalProps) {
  return (
    <Modal
      open={åpen}
      onClose={oppretter ? undefined : onClose}
      header={{ heading: "Opprett dokument", closeButton: !oppretter }}
      width="40rem"
    >
      <Modal.Body>
        {oppretter ? (
          <div className="flex justify-center py-[var(--ax-space-48)]">
            <Loader size="large" title="Oppretter dokument" />
          </div>
        ) : (
          <VStack gap="space-20">
            <VStack gap="space-12">
              <BodyShort size="small" weight="semibold" textColor="subtle">
                Rapportmaler
              </BodyShort>
              <HGrid columns={{ xs: 1, sm: 2 }} gap="space-8">
                {MAL_IDER.flatMap((malId) => [
                  <MalValg
                    key={`${malId}-ikke-straffesak`}
                    malId={malId}
                    erStraffesak={false}
                    onVelg={onVelg}
                  />,
                  <MalValg
                    key={`${malId}-straffesak`}
                    malId={malId}
                    erStraffesak
                    onVelg={onVelg}
                  />,
                ])}
              </HGrid>
            </VStack>

            <div className="flex items-center gap-[var(--ax-space-8)] text-ax-text-neutral-subtle">
              <hr className="flex-1 border-ax-border-neutral-subtle" />
              <BodyShort size="small">eller</BodyShort>
              <hr className="flex-1 border-ax-border-neutral-subtle" />
            </div>

            <Button
              type="button"
              variant="secondary"
              data-color="neutral"
              onClick={() => onVelg()}
              className="relative h-[64px] w-full justify-start px-[var(--ax-space-16)] text-left !shadow-[inset_0_0_0_1px_var(--ax-border-neutral-subtle)] hover:!bg-ax-bg-neutral-soft hover:!shadow-[inset_0_0_0_1px_var(--ax-border-neutral-subtle)]"
            >
              <span className="flex min-w-0 items-center gap-[var(--ax-space-12)]">
                <FileIcon aria-hidden className="h-7 w-7 shrink-0" />
                <span>
                  <BodyShort as="span" size="small" weight="semibold" className="block">
                    Blankt dokument
                  </BodyShort>
                  <BodyShort as="span" size="small" textColor="subtle" className="block">
                    Start fra en tom side
                  </BodyShort>
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden
                className="absolute right-[var(--ax-space-16)] top-1/2 -translate-y-1/2"
              />
            </Button>
          </VStack>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose} disabled={oppretter}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
