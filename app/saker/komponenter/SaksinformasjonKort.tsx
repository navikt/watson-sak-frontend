import { PlusIcon } from "@navikt/aksel-icons";
import {
  Alert,
  Button,
  Detail,
  ErrorSummary,
  Heading,
  HGrid,
  HStack,
  Select,
  Tag,
  Tooltip,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker, useFetcher, useRevalidator } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { Kort } from "~/komponenter/Kort";
import {
  ankerIdForFelt,
  førsteFeilForFelt,
  samleFeilElementer,
  YtelseRadFelt,
} from "~/registrer-sak/YtelseRadFelt";
import type { YtelseRadVerdier } from "~/registrer-sak/skjema-helpers";
import { merkingEtikett } from "~/saker/kategorier";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { formaterIsoTilNorskDato, getPersonIdent } from "~/saker/visning";
import { formaterOrganisasjonsnummer } from "~/utils/string-utils";
import { PersonIdentMedHistorikk } from "./PersonIdentMedHistorikk";
import { ResponsivEndreKnapp } from "./ResponsivEndreKnapp";
import { SakDetaljerFelter } from "./SakDetaljerFelter";
import type {
  RedigerSaksinformasjonData,
  RedigerSaksinformasjonResultat,
} from "./Saksinformasjon.types";

interface SaksinformasjonKortProps {
  sak: KontrollsakResponse;
  tittel: string;
  kanRedigere: boolean;
  onVisIdentHistorikk: () => void;
  onSakOppdatert: (sak: KontrollsakResponse) => void;
}

function lagYtelseRaderFraSak(sak: KontrollsakResponse): YtelseRadVerdier[] {
  if (sak.ytelser.length === 0) {
    return [{}];
  }
  return sak.ytelser.map((ytelse) => ({
    type: ytelse.type || undefined,
    fraDato: formaterIsoTilNorskDato(ytelse.periodeFra) || undefined,
    tilDato: formaterIsoTilNorskDato(ytelse.periodeTil) || undefined,
    beløp: ytelse.belop !== null && ytelse.belop !== undefined ? String(ytelse.belop) : undefined,
    endeligBeløp:
      ytelse.endeligBelop !== null && ytelse.endeligBelop !== undefined
        ? String(ytelse.endeligBelop)
        : undefined,
  }));
}

function lagRedigeringsdata(sak: KontrollsakResponse): RedigerSaksinformasjonData {
  return {
    kategori: sak.kategori,
    kilde: sak.kilde,
    misbruktype: [...sak.misbruktype],
    merking: [...sak.merking],
    arbeidsgivere: [...(sak.arbeidsgivere ?? [])],
    ytelser: lagYtelseRaderFraSak(sak),
  };
}

function erLikeStringArrays(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortA = [...a].sort();
  const sortB = [...b].sort();
  return sortA.every((verdi, indeks) => verdi === sortB[indeks]);
}

function erLikeYtelser(a: YtelseRadVerdier[], b: YtelseRadVerdier[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (rad, indeks) =>
      rad.type === b[indeks].type &&
      rad.fraDato === b[indeks].fraDato &&
      rad.tilDato === b[indeks].tilDato &&
      rad.beløp === b[indeks].beløp &&
      rad.endeligBeløp === b[indeks].endeligBeløp,
  );
}

function erLikeRedigeringsdata(a: RedigerSaksinformasjonData, b: RedigerSaksinformasjonData) {
  return (
    a.kategori === b.kategori &&
    a.kilde === b.kilde &&
    erLikeStringArrays(a.arbeidsgivere, b.arbeidsgivere) &&
    erLikeStringArrays(a.misbruktype, b.misbruktype) &&
    erLikeStringArrays(a.merking, b.merking) &&
    erLikeYtelser(a.ytelser, b.ytelser)
  );
}

function hentMisbrukstypeAlternativer(
  kategori: string,
  misbrukstyper: { kode: string; kategori: string }[],
): readonly string[] {
  if (!kategori) {
    return [];
  }
  return misbrukstyper
    .filter((misbrukstype) => misbrukstype.kategori === kategori)
    .map((m) => m.kode);
}

export function SaksinformasjonKort({
  sak,
  tittel,
  kanRedigere,
  onVisIdentHistorikk,
  onSakOppdatert,
}: SaksinformasjonKortProps) {
  const kodeverk = useKodeverk();
  const fetcher = useFetcher<RedigerSaksinformasjonResultat>();
  const revalidator = useRevalidator();
  const [redigerer, setRedigerer] = useState(false);
  const [redigeringsøkt, setRedigeringsøkt] = useState(0);
  const [visFeil, setVisFeil] = useState(false);
  const [lokaleVerdier, setLokaleVerdier] = useState<RedigerSaksinformasjonData>(() =>
    lagRedigeringsdata(sak),
  );
  const utgangspunkt = useMemo(() => lagRedigeringsdata(sak), [sak]);
  const ytelseAlternativer = useMemo(
    () => kodeverk.ytelseTyper.map((ytelse) => ({ value: ytelse.kode, label: ytelse.beskrivelse })),
    [kodeverk.ytelseTyper],
  );
  const misbrukstypeBeskrivelseMap = useMemo(
    () =>
      new Map(
        kodeverk.misbrukstyper.map((misbrukstype) => [misbrukstype.kode, misbrukstype.beskrivelse]),
      ),
    [kodeverk.misbrukstyper],
  );
  const feil: Record<string, string[]> | undefined =
    visFeil && fetcher.data && !fetcher.data.ok ? fetcher.data.feil : undefined;
  const feilElementer = samleFeilElementer(feil);
  const errorSummaryId = useId();
  const harUlagredeEndringer = redigerer && !erLikeRedigeringsdata(lokaleVerdier, utgangspunkt);
  const blocker = useBlocker(harUlagredeEndringer);
  const sisteBehandledeData = useRef<typeof fetcher.data>(undefined);
  const personIdent = getPersonIdent(sak);
  const visPersonIdent = sak.gjeldendePersonIdent ?? personIdent;
  const harHistoriskIdent = sak.historiskeIdenter.some((ident) => ident.historisk);
  const misbrukstypeAlternativer = hentMisbrukstypeAlternativer(
    lokaleVerdier.kategori,
    kodeverk.misbrukstyper,
  );

  useEffect(() => {
    if (fetcher.data === sisteBehandledeData.current) return;
    sisteBehandledeData.current = fetcher.data;

    if (fetcher.data?.ok) {
      if (fetcher.data.sak) {
        onSakOppdatert(fetcher.data.sak);
      }
      setVisFeil(false);
      setRedigerer(false);
      void revalidator.revalidate();
      return;
    }

    if (fetcher.data && !fetcher.data.ok) {
      setVisFeil(true);
      if (fetcher.data.verdier) {
        setLokaleVerdier(fetcher.data.verdier);
      }
    }
  }, [fetcher.data, onSakOppdatert, revalidator]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    if (window.confirm("Du har ulagrede endringer. Er du sikker på at du vil forlate siden?")) {
      blocker.proceed();
      return;
    }
    blocker.reset();
  }, [blocker]);

  useBeforeUnload((event) => {
    if (!harUlagredeEndringer) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function oppdaterLokaleVerdier<K extends keyof RedigerSaksinformasjonData>(
    felt: K,
    verdi: RedigerSaksinformasjonData[K],
  ) {
    setLokaleVerdier((gjeldende) => ({ ...gjeldende, [felt]: verdi }));
  }

  function startRedigering() {
    setRedigeringsøkt((gjeldende) => gjeldende + 1);
    setVisFeil(false);
    setRedigerer(true);
    setLokaleVerdier(utgangspunkt);
  }

  function avbrytRedigering() {
    setVisFeil(false);
    setRedigerer(false);
    setLokaleVerdier(utgangspunkt);
  }

  function leggTilYtelseRad() {
    setLokaleVerdier((gjeldende) => ({
      ...gjeldende,
      ytelser: [...gjeldende.ytelser, {}],
    }));
  }

  function fjernYtelseRad(indeks: number) {
    setLokaleVerdier((gjeldende) => {
      const nyeYtelser = gjeldende.ytelser.filter(
        (_, gjeldendeIndeks) => gjeldendeIndeks !== indeks,
      );
      return { ...gjeldende, ytelser: nyeYtelser.length > 0 ? nyeYtelser : [{}] };
    });
  }

  return (
    <Kort>
      <VStack gap="space-4">
        <HStack justify="space-between" align="start">
          <Heading level="1" size="large">
            {tittel}
          </Heading>
          {sak.adresseskjermet && (
            <Tooltip content="Denne personen er skjermet">
              <Tag variant="strong" data-color="danger" size="medium">
                Diskresjon
              </Tag>
            </Tooltip>
          )}
        </HStack>

        <hr className="border-ax-border-neutral-subtle" />

        {redigerer ? (
          <fetcher.Form
            method="post"
            key={redigeringsøkt}
            onSubmit={() => sporHendelse("sak redigert", { kategori: lokaleVerdier.kategori })}
          >
            <input type="hidden" name="handling" value="rediger_saksinformasjon" />

            <VStack gap="space-6">
              {feilElementer.length > 0 && (
                <ErrorSummary
                  id={errorSummaryId}
                  heading="Du må rette følgende feil før du kan lagre:"
                >
                  {feilElementer.map((element) => (
                    <ErrorSummary.Item key={element.id} href={`#${element.id}`}>
                      {element.melding}
                    </ErrorSummary.Item>
                  ))}
                </ErrorSummary>
              )}

              {feil?.skjema?.[0] && <Alert variant="error">{feil.skjema[0]}</Alert>}

              <VStack gap="space-1">
                <Detail className="text-ax-text-neutral-subtle" uppercase>
                  Personnummer
                </Detail>
                <PersonIdentMedHistorikk
                  personIdent={visPersonIdent}
                  harHistorikk={harHistoriskIdent}
                  onVisHistorikk={onVisIdentHistorikk}
                />
                {sak.gjeldendePersonIdent && sak.gjeldendePersonIdent !== sak.personIdent && (
                  <Detail className="text-ax-text-neutral-subtle">
                    Saken ble opprettet under {personIdent}
                  </Detail>
                )}
              </VStack>

              <HGrid columns={{ xs: 1, md: 2, xl: 3 }} gap="space-4">
                <div className="w-fit">
                  <Select
                    id={ankerIdForFelt("kategori")}
                    name="kategori"
                    label="Kategori"
                    size="small"
                    value={lokaleVerdier.kategori}
                    error={førsteFeilForFelt(feil, "kategori")}
                    onChange={(event) => {
                      const kategori = event.target.value;
                      const gyldigeMisbrukstyper = hentMisbrukstypeAlternativer(
                        kategori,
                        kodeverk.misbrukstyper,
                      );
                      setLokaleVerdier((gjeldende) => ({
                        ...gjeldende,
                        kategori,
                        misbruktype: gjeldende.misbruktype.filter((type) =>
                          gyldigeMisbrukstyper.includes(type),
                        ),
                      }));
                    }}
                  >
                    <option value="">Velg kategori</option>
                    {kodeverk.kategorier.map((kategori) => (
                      <option key={kategori.kode} value={kategori.kode}>
                        {kategori.beskrivelse}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="w-fit">
                  <Select
                    id={ankerIdForFelt("kilde")}
                    name="kilde"
                    label="Kilde"
                    size="small"
                    value={lokaleVerdier.kilde}
                    error={førsteFeilForFelt(feil, "kilde")}
                    onChange={(event) => oppdaterLokaleVerdier("kilde", event.target.value)}
                  >
                    <option value="">Velg kilde</option>
                    {kodeverk.kilder.map((kilde) => (
                      <option key={kilde.kode} value={kilde.kode}>
                        {kilde.beskrivelse}
                      </option>
                    ))}
                  </Select>
                </div>

                <div aria-hidden className="hidden xl:block" />

                <div id={ankerIdForFelt("misbruktype")} className="w-fit">
                  <UNSAFE_Combobox
                    label="Misbruktype"
                    size="small"
                    options={misbrukstypeAlternativer.map((kode) => ({
                      value: kode,
                      label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
                    }))}
                    isMultiSelect
                    disabled={misbrukstypeAlternativer.length === 0}
                    selectedOptions={lokaleVerdier.misbruktype.map((kode) => ({
                      value: kode,
                      label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
                    }))}
                    onToggleSelected={(option, isSelected) => {
                      setLokaleVerdier((gjeldende) => {
                        const finnes = gjeldende.misbruktype.includes(option);
                        if (isSelected && !finnes) {
                          return {
                            ...gjeldende,
                            misbruktype: [...gjeldende.misbruktype, option],
                          };
                        }
                        if (!isSelected) {
                          return {
                            ...gjeldende,
                            misbruktype: gjeldende.misbruktype.filter((verdi) => verdi !== option),
                          };
                        }
                        return gjeldende;
                      });
                    }}
                    error={førsteFeilForFelt(feil, "misbruktype")}
                  />
                  {lokaleVerdier.misbruktype.map((type) => (
                    <input key={type} type="hidden" name="misbruktype" value={type} />
                  ))}
                </div>

                <div className="w-fit">
                  <UNSAFE_Combobox
                    id={ankerIdForFelt("arbeidsgivere")}
                    label="Organisasjonsnummer (valgfritt)"
                    size="small"
                    isMultiSelect
                    allowNewValues
                    options={[]}
                    selectedOptions={lokaleVerdier.arbeidsgivere.map((orgnr) => ({
                      label: formaterOrganisasjonsnummer(orgnr),
                      value: orgnr,
                    }))}
                    onToggleSelected={(option, isSelected) => {
                      setLokaleVerdier((gjeldende) => {
                        if (isSelected && !gjeldende.arbeidsgivere.includes(option)) {
                          return {
                            ...gjeldende,
                            arbeidsgivere: [...gjeldende.arbeidsgivere, option],
                          };
                        }
                        if (!isSelected) {
                          return {
                            ...gjeldende,
                            arbeidsgivere: gjeldende.arbeidsgivere.filter(
                              (verdi) => verdi !== option,
                            ),
                          };
                        }
                        return gjeldende;
                      });
                    }}
                    error={førsteFeilForFelt(feil, "arbeidsgivere")}
                  />
                  {lokaleVerdier.arbeidsgivere.map((orgnr) => (
                    <input key={orgnr} type="hidden" name="arbeidsgivere" value={orgnr} />
                  ))}
                </div>

                <div aria-hidden className="hidden xl:block" />

                <div id={ankerIdForFelt("merking")} className="w-fit">
                  <UNSAFE_Combobox
                    label="Merking"
                    size="small"
                    options={kodeverk.merker.map((merke) => ({
                      label: merkingEtikett(merke),
                      value: merke,
                    }))}
                    isMultiSelect
                    allowNewValues
                    selectedOptions={lokaleVerdier.merking.map((merke) => ({
                      label: merkingEtikett(merke),
                      value: merke,
                    }))}
                    onToggleSelected={(option, isSelected) => {
                      setLokaleVerdier((gjeldende) => {
                        const finnes = gjeldende.merking.includes(option);
                        if (isSelected && !finnes) {
                          return { ...gjeldende, merking: [...gjeldende.merking, option] };
                        }
                        if (!isSelected) {
                          return {
                            ...gjeldende,
                            merking: gjeldende.merking.filter((verdi) => verdi !== option),
                          };
                        }
                        return gjeldende;
                      });
                    }}
                    error={førsteFeilForFelt(feil, "merking")}
                  />
                  {lokaleVerdier.merking.map((merking) => (
                    <input key={merking} type="hidden" name="merking" value={merking} />
                  ))}
                </div>
              </HGrid>

              <hr className="my-4 border-ax-border-neutral-subtle" />

              <VStack gap="space-8">
                <Heading level="2" size="small">
                  Ytelser
                </Heading>
                {lokaleVerdier.ytelser.map((rad, indeks) => (
                  <YtelseRadFelt
                    key={`${redigeringsøkt}-${indeks}`}
                    indeks={indeks}
                    ytelser={ytelseAlternativer}
                    kanFjernes={lokaleVerdier.ytelser.length > 1}
                    onFjern={() => fjernYtelseRad(indeks)}
                    defaults={rad}
                    feil={feil}
                    size="small"
                    endeligBeløpReadOnly={sak.steg !== "STRAFFERETTSLIG_VURDERING"}
                  />
                ))}
                <div>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="small"
                    icon={<PlusIcon aria-hidden />}
                    onClick={leggTilYtelseRad}
                  >
                    Legg til ytelse
                  </Button>
                </div>
              </VStack>

              <HStack justify="end" gap="space-4">
                <Button size="small" type="button" variant="secondary" onClick={avbrytRedigering}>
                  Avbryt
                </Button>
                <Button size="small" type="submit" loading={fetcher.state !== "idle"}>
                  Lagre
                </Button>
              </HStack>
            </VStack>
          </fetcher.Form>
        ) : (
          <VStack gap="space-4">
            <SakDetaljerFelter sak={sak} onVisIdentHistorikk={onVisIdentHistorikk} />
            {kanRedigere && (
              <HStack justify="end">
                <ResponsivEndreKnapp ariaLabel="Endre saksinformasjon" onClick={startRedigering} />
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </Kort>
  );
}
