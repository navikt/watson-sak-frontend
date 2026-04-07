import { ArrowLeftIcon, GavelIcon } from "@navikt/aksel-icons";
import { Alert, Button, Heading, HStack, Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { hentFilerForSak } from "~/saker/filer/mock-data.server";
import { leggTilHendelse } from "~/saker/historikk/mock-data.server";
import { finnSakMedReferanse, getSaksreferanse } from "~/saker/id";
import { hentJournalposter } from "~/saker/joark/mock-data.server";
import { SaksinformasjonKort } from "~/saker/komponenter/SaksinformasjonKort";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { getPersonIdent } from "~/saker/visning";
import { DokumentVelger } from "~/saker/videresending/DokumentVelger";
import { OppsummeringSkjema } from "~/saker/videresending/OppsummeringSkjema";
import { politianmeldelseSkjemaRefinert } from "./typer";
import type { Route } from "./+types/PolitianmeldelseSide.route";

function hentPolitianmeldbareSaker() {
  return hentAlleSaker();
}

export function loader({ params }: Route.LoaderArgs) {
  const sak = finnSakMedReferanse(hentPolitianmeldbareSaker(), params.sakId);
  if (!sak) {
    throw new Response("Sak ikke funnet", { status: 404 });
  }
  if (sak.status !== "UTREDES") {
    throw redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)));
  }

  const filer = hentFilerForSak(sak.id);
  const journalposter = hentJournalposter(getPersonIdent(sak));

  return { sak, filer, journalposter };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();

  const rådata = {
    valgteFiler: formData.getAll("valgteFiler"),
    valgteJournalposter: formData.getAll("valgteJournalposter"),
    funn: formData.get("funn"),
    vurdering: formData.get("vurdering"),
    anbefaling: formData.get("anbefaling"),
  };

  const resultat = politianmeldelseSkjemaRefinert.safeParse(rådata);

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
  const sak = finnSakMedReferanse(hentPolitianmeldbareSaker(), sakId);
  if (!sak) {
    throw new Response("Sak ikke funnet", { status: 404 });
  }

  const data = resultat.data;
  sak.status = "TIL_FORVALTNING";

  void data;
  leggTilHendelse(sak, "POLITIANMELDT");

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)));
}

export default function PolitianmeldelseSide() {
  const { sak, filer, journalposter } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil = actionData?.feil as Record<string, string[] | undefined> | undefined;

  const [valgteFiler, setValgteFiler] = useState<string[]>([]);
  const [valgteJournalposter, setValgteJournalposter] = useState<string[]>([]);
  const [funn, setFunn] = useState("");
  const [vurdering, setVurdering] = useState("");
  const [anbefaling, setAnbefaling] = useState("");

  const tilbakeUrl = RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id));
  const saksreferanse = getSaksreferanse(sak.id);

  return (
    <Page>
      <title>{`Politianmeldelse – Sak ${saksreferanse} – Watson Sak`}</title>
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
              Opprett politianmeldelse
            </Heading>
          </VStack>

          <Form method="post">
            <VStack gap="space-8">
              <SaksinformasjonKort sak={sak} />

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
                <Button type="submit" variant="danger" icon={<GavelIcon aria-hidden />}>
                  Send politianmeldelse
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
