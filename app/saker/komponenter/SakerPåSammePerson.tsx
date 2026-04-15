import { ChevronDownIcon, ChevronUpIcon, LinkIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Button,
  CopyButton,
  Detail,
  Heading,
  HStack,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { Form } from "react-router";
import { useState } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getSaksreferanse } from "~/saker/id";
import {
  getAlder,
  getBelop,
  getKategoriText,
  getMisbrukstyper,
  getNavn,
  getPeriodeText,
  getStatusVariantForSak,
  getTags,
} from "~/saker/selectors";
import {
  formaterBelop,
  getKildeText,
  getPersonIdent,
  getStatus,
  getYtelseTyper,
} from "~/saker/visning";

interface SakerPåSammePersonProps {
  saker: KontrollsakResponse[];
  gjeldendeSakId: string;
}

interface SakKortProps {
  sak: KontrollsakResponse;
}

function SakFelt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-4">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort size="small">{children}</BodyShort>
    </VStack>
  );
}

function SakKort({ sak }: SakKortProps) {
  const [åpen, setÅpen] = useState(false);
  const saksreferanse = getSaksreferanse(sak.id);
  const personIdent = getPersonIdent(sak);
  const navn = getNavn(sak);
  const alder = getAlder(sak);
  const statusTekst = getStatus(sak);
  const periodeText = getPeriodeText(sak);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const belop = getBelop(sak);
  const ytelseTyper = getYtelseTyper(sak);
  const tags = getTags(sak);
  const kildeTekst = getKildeText(sak);
  const opprettetAv = sak.saksbehandlere.opprettetAv.navn ?? sak.saksbehandlere.opprettetAv.navIdent;

  const tittelDeler = [personIdent];
  if (navn) tittelDeler.push(navn);
  if (alder !== null) tittelDeler.push(`(${alder})`);

  return (
    <Box borderRadius="8" background="raised" padding="space-16" shadow="dialog">
      <VStack gap="space-16">
        <HStack justify="space-between" align="center" wrap gap="space-8">
          <HStack gap="space-16" align="center" wrap>
            <BodyShort size="small" weight="semibold">
              Personnummer: <span className="font-bold">{personIdent}</span>
            </BodyShort>
            <BodyShort size="small">
              Saksid: <span className="font-bold">{saksreferanse}</span>
            </BodyShort>
            <BodyShort size="small">
              Opprettet av: <span className="font-bold">{opprettetAv}</span>
            </BodyShort>
            <BodyShort size="small">
              Eier: <span className="font-bold">{sak.saksbehandlere.eier?.navn ?? "Ufordelt"}</span>
            </BodyShort>
            <Tag variant={getStatusVariantForSak(sak)} size="small">
              {statusTekst}
            </Tag>
          </HStack>
          <Button
            variant="tertiary"
            size="xsmall"
            icon={åpen ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
            iconPosition="right"
            onClick={() => setÅpen((prev) => !prev)}
            aria-expanded={åpen}
          >
            {åpen ? "Skjul" : "Vis detaljer"}
          </Button>
        </HStack>

        {åpen && (
          <>
            <hr className="border-ax-border-neutral-subtle" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <VStack gap="space-16">
                <VStack gap="space-4">
                  <Detail className="text-ax-text-neutral-subtle" uppercase>
                    Personnummer
                  </Detail>
                  <HStack gap="space-4" align="center">
                    <BodyShort size="small">{personIdent}</BodyShort>
                    <CopyButton size="xsmall" copyText={personIdent} />
                  </HStack>
                </VStack>

                {kategoriText && (
                  <SakFelt label="Kategori">
                    <Tag variant="neutral" size="small">
                      {kategoriText}
                    </Tag>
                  </SakFelt>
                )}

                {misbrukstyper.length > 0 && (
                  <VStack gap="space-4">
                    <Detail className="text-ax-text-neutral-subtle" uppercase>
                      Misbrukstype
                    </Detail>
                    <HStack gap="space-4" wrap>
                      {misbrukstyper.map((type) => (
                        <Tag key={type} variant="warning" size="small">
                          {type}
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                )}

                {tags.length > 0 && (
                  <VStack gap="space-4">
                    <Detail className="text-ax-text-neutral-subtle" uppercase>
                      Merking
                    </Detail>
                    <HStack gap="space-4" wrap>
                      {tags.map((tag) => (
                        <Tag key={tag} variant="neutral" size="small">
                          {tag}
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                )}

                <SakFelt label="Kilde">{kildeTekst}</SakFelt>
              </VStack>

              <VStack gap="space-16">
                {periodeText && <SakFelt label="Periode">{periodeText}</SakFelt>}

                {belop !== null && <SakFelt label="Ca beløp">{formaterBelop(belop)}</SakFelt>}

                {ytelseTyper.length > 0 && (
                  <VStack gap="space-4">
                    <Detail className="text-ax-text-neutral-subtle" uppercase>
                      Ytelse
                    </Detail>
                    <HStack gap="space-4" wrap>
                      {ytelseTyper.map((ytelse) => (
                        <Tag key={ytelse} variant="success" size="small">
                          {ytelse}
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                )}
              </VStack>
            </div>

            <HStack justify="end">
              <Form method="post">
                <input type="hidden" name="handling" value="koble_sak" />
                <input type="hidden" name="relatertSakId" value={sak.id} />
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  icon={<LinkIcon aria-hidden />}
                  iconPosition="right"
                >
                  Koble til saken
                </Button>
              </Form>
            </HStack>
          </>
        )}
      </VStack>
    </Box>
  );
}

export function SakerPåSammePerson({ saker, gjeldendeSakId }: SakerPåSammePersonProps) {
  const andreSaker = saker.filter((sak) => sak.id !== gjeldendeSakId);

  if (andreSaker.length === 0) {
    return null;
  }

  return (
    <Box borderRadius="8" background="raised">
      <VStack gap="space-8">
        <Heading level="2" size="small">
          Saker på samme person
        </Heading>
        {andreSaker.map((sak) => (
          <SakKort key={sak.id} sak={sak} />
        ))}
      </VStack>
    </Box>
  );
}
