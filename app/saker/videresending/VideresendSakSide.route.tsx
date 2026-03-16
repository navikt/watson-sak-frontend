import { ArrowLeftIcon, PaperplaneIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Button,
  CopyButton,
  Detail,
  Heading,
  HStack,
  Page,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { mockSaker } from "~/fordeling/mock-data.server";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import { RouteConfig } from "~/routeConfig";
import { hentFilerForSak } from "~/saker/filer/mock-data.server";
import { leggTilHendelse } from "~/saker/historikk/mock-data.server";
import { hentJournalposter } from "~/saker/joark/mock-data.server";
import { hentStatusVariant, formaterKilde } from "~/saker/utils";
import { formaterDato } from "~/utils/date-utils";
import { DokumentVelger } from "./DokumentVelger";
import { MottakerVelger } from "./MottakerVelger";
import { OppsummeringSkjema } from "./OppsummeringSkjema";
import { videresendingSkjemaRefinert, type Mottaker } from "./typer";
import type { Route } from "./+types/VideresendSakSide.route";

const alleSaker = [...mockSaker, ...mockMineSaker];

export function loader({ params }: Route.LoaderArgs) {
  const sak = alleSaker.find((s) => s.id === params.sakId);
  if (!sak) {
    throw new Response("Sak ikke funnet", { status: 404 });
  }
  if (sak.status !== "under utredning") {
    throw redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", params.sakId));
  }

  const filer = hentFilerForSak(sak.id);
  const journalposter = hentJournalposter(sak.fødselsnummer);

  return { sak, filer, journalposter };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();

  const rådata = {
    mottaker: formData.get("mottaker"),
    valgteFiler: formData.getAll("valgteFiler"),
    valgteJournalposter: formData.getAll("valgteJournalposter"),
    funn: formData.get("funn"),
    vurdering: formData.get("vurdering"),
    anbefaling: formData.get("anbefaling"),
  };

  const resultat = videresendingSkjemaRefinert.safeParse(rådata);

  if (!resultat.success) {
    const flattened = resultat.error.flatten();
    return {
      feil: {
        ...flattened.fieldErrors,
        dokumenter: flattened.formErrors.length > 0 ? flattened.formErrors : undefined,
      },
    };
  }

  const sakId = params.sakId;
  const sak = alleSaker.find((s) => s.id === sakId);
  if (!sak) {
    throw new Response("Sak ikke funnet", { status: 404 });
  }

  const data = resultat.data;
  sak.status = "videresendt til nay/nfp";

  leggTilHendelse(sakId, "videresendt_nay_nfp", "Ola Nordmann", {
    til: data.mottaker === "nay" ? "NAY" : "NFP",
    notat: `Funn: ${data.funn} | Vurdering: ${data.vurdering} | Anbefaling: ${data.anbefaling}`,
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", sakId));
}

export default function VideresendSakSide() {
  const { sak, filer, journalposter } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil = actionData?.feil as Record<string, string[] | undefined> | undefined;

  const [mottaker, setMottaker] = useState<Mottaker | undefined>(undefined);
  const [valgteFiler, setValgteFiler] = useState<string[]>([]);
  const [valgteJournalposter, setValgteJournalposter] = useState<string[]>([]);
  const [funn, setFunn] = useState("");
  const [vurdering, setVurdering] = useState("");
  const [anbefaling, setAnbefaling] = useState("");

  const tilbakeUrl = RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id);

  return (
    <Page>
      <title>{`Videresend sak ${sak.id} – Watson Sak`}</title>
      <PageBlock width="lg" gutters className="!mx-0">
        <VStack gap="space-12" className="py-6">
          <VStack gap="space-4">
            <div>
              <Button
                as={Link}
                to={tilbakeUrl}
                variant="tertiary"
                size="small"
                icon={<ArrowLeftIcon aria-hidden />}
              >
                Tilbake til sak
              </Button>
            </div>
            <Heading level="1" size="large">
              Videresend sak til NAY/NFP
            </Heading>
          </VStack>

          <Form method="post">
            <VStack gap="space-8">
              <Kort>
                <VStack gap="space-4">
                  <Heading level="2" size="small">
                    Saksinformasjon
                  </Heading>
                  <HStack gap="space-8" wrap>
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Sak-ID
                      </Detail>
                      <HStack gap="space-1" align="center">
                        <BodyShort>{sak.id}</BodyShort>
                        <CopyButton size="xsmall" copyText={sak.id} />
                      </HStack>
                    </VStack>
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Fødselsnummer
                      </Detail>
                      <HStack gap="space-1" align="center">
                        <BodyShort>{sak.fødselsnummer}</BodyShort>
                        <CopyButton size="xsmall" copyText={sak.fødselsnummer} />
                      </HStack>
                    </VStack>
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Status
                      </Detail>
                      <Tag variant={hentStatusVariant(sak.status)} size="small">
                        {sak.status}
                      </Tag>
                    </VStack>
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Innmeldt
                      </Detail>
                      <BodyShort>{formaterDato(sak.datoInnmeldt)}</BodyShort>
                    </VStack>
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Kilde
                      </Detail>
                      <BodyShort>{formaterKilde(sak.kilde)}</BodyShort>
                    </VStack>
                  </HStack>
                </VStack>
              </Kort>

              <Kort>
                <input type="hidden" name="mottaker" value={mottaker ?? ""} />
                <MottakerVelger
                  valgt={mottaker}
                  onChange={setMottaker}
                  feil={feil?.mottaker?.join(", ")}
                />
              </Kort>

              <Kort>
                {valgteFiler.map((filId) => (
                  <input key={filId} type="hidden" name="valgteFiler" value={filId} />
                ))}
                {valgteJournalposter.map((jpId) => (
                  <input key={jpId} type="hidden" name="valgteJournalposter" value={jpId} />
                ))}
                <DokumentVelger
                  filer={filer}
                  journalposter={journalposter}
                  valgteFiler={valgteFiler}
                  valgteJournalposter={valgteJournalposter}
                  onFilerChange={setValgteFiler}
                  onJournalposterChange={setValgteJournalposter}
                  feil={feil?.dokumenter?.join(", ")}
                />
              </Kort>

              <Kort>
                <OppsummeringSkjema
                  funn={funn}
                  vurdering={vurdering}
                  anbefaling={anbefaling}
                  onChange={(felt, verdi) => {
                    if (felt === "funn") setFunn(verdi);
                    if (felt === "vurdering") setVurdering(verdi);
                    if (felt === "anbefaling") setAnbefaling(verdi);
                  }}
                  feil={{
                    funn: feil?.funn?.join(", "),
                    vurdering: feil?.vurdering?.join(", "),
                    anbefaling: feil?.anbefaling?.join(", "),
                  }}
                />
              </Kort>

              {feil && Object.keys(feil).length > 0 && (
                <Alert variant="error">
                  Skjemaet inneholder feil. Vennligst rett opp feilene ovenfor.
                </Alert>
              )}

              <HStack gap="space-4">
                <Button type="submit" icon={<PaperplaneIcon aria-hidden />}>
                  Send til {mottaker === "nfp" ? "NFP" : "NAY/NFP"}
                </Button>
                <Button as={Link} to={tilbakeUrl} variant="secondary">
                  Avbryt
                </Button>
              </HStack>
            </VStack>
          </Form>
        </VStack>
      </PageBlock>
    </Page>
  );
}
