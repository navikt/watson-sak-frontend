import type { FieldMetadata } from "@conform-to/react";
import { HStack, Select, UNSAFE_Combobox } from "@navikt/ds-react";
import type { Kodeverk } from "~/saker/api.server";
import { merkingEtikett } from "~/saker/kategorier";

type Felt = FieldMetadata<unknown, Record<string, unknown>, string[]>;

type Props = {
  fields: {
    kategori: Felt;
    misbruktype: Felt;
    kilde: Felt;
    enhet: Felt;
    merking: Felt;
    arbeidsgivere: Felt;
  };
  kodeverk: Kodeverk;
  tilgjengeligeMisbruktyper: string[];
  misbrukstypeBeskrivelseMap: Map<string, string>;
  valgteMisbruktyper: string[];
  setValgteMisbruktyper: (updater: (previous: string[]) => string[]) => void;
  valgteMerkinger: string[];
  setValgteMerkinger: (updater: (previous: string[]) => string[]) => void;
  valgteArbeidsgivere: string[];
  setValgteArbeidsgivere: (updater: (previous: string[]) => string[]) => void;
};

export function GrunnleggendeSaksfelter({
  fields,
  kodeverk,
  tilgjengeligeMisbruktyper,
  misbrukstypeBeskrivelseMap,
  valgteMisbruktyper,
  setValgteMisbruktyper,
  valgteMerkinger,
  setValgteMerkinger,
  valgteArbeidsgivere,
  setValgteArbeidsgivere,
}: Props) {
  return (
    <>
      {/* Rad 1 (påkrevd): Kategori, Misbruktype, Kilde — tre felt per rad iht Figma */}
      <HStack gap="space-24" align="start" wrap>
        <Select
          key={fields.kategori.key}
          name={fields.kategori.name}
          id={fields.kategori.id}
          label="Kategori"
          error={fields.kategori.errors?.[0]}
          className="w-52"
          defaultValue={fields.kategori.initialValue as string | undefined}
          onChange={(e) => {
            const gyldige = kodeverk.misbrukstyper
              .filter((misbruktype) => misbruktype.kategori === e.target.value)
              .map((misbruktype) => misbruktype.kode);
            if (gyldige.length > 0) {
              setValgteMisbruktyper((prev) => prev.filter((m) => gyldige.includes(m)));
            } else {
              setValgteMisbruktyper(() => []);
            }
          }}
        >
          <option value="">Velg kategori</option>
          {kodeverk.kategorier.map((k) => (
            <option key={k.kode} value={k.kode}>
              {k.beskrivelse}
            </option>
          ))}
        </Select>

        <div id={fields.misbruktype.id} className="w-72">
          <UNSAFE_Combobox
            label="Misbruktype"
            options={tilgjengeligeMisbruktyper.map((kode) => ({
              value: kode,
              label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
            }))}
            isMultiSelect
            disabled={tilgjengeligeMisbruktyper.length === 0}
            selectedOptions={valgteMisbruktyper.map((kode) => ({
              value: kode,
              label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
            }))}
            onToggleSelected={(option, isSelected) => {
              setValgteMisbruktyper((prev) => {
                if (isSelected) return prev.includes(option) ? prev : [...prev, option];
                return prev.filter((m) => m !== option);
              });
            }}
            error={fields.misbruktype.errors?.[0]}
          />
          {valgteMisbruktyper.map((m) => (
            <input key={m} type="hidden" name="misbruktype" value={m} />
          ))}
        </div>

        <Select
          key={fields.kilde.key}
          name={fields.kilde.name}
          id={fields.kilde.id}
          label="Kilde"
          error={fields.kilde.errors?.[0]}
          className="w-52"
          defaultValue={fields.kilde.initialValue as string | undefined}
        >
          <option value="">Velg kilde</option>
          {kodeverk.kilder.map((k) => (
            <option key={k.kode} value={k.kode}>
              {k.beskrivelse}
            </option>
          ))}
        </Select>
      </HStack>

      {/* Rad 2 (Enhet påkrevd, resten valgfritt): Enhet, Merking, Organisasjonsnummer — tre felt per rad iht Figma */}
      <HStack gap="space-24" align="start" wrap>
        <Select
          key={fields.enhet.key}
          name={fields.enhet.name}
          id={fields.enhet.id}
          label="Enhet"
          error={fields.enhet.errors?.[0]}
          className="w-44"
          defaultValue={fields.enhet.initialValue as string | undefined}
        >
          <option value="">Velg enhet</option>
          {kodeverk.enheter.map((e) => (
            <option key={e.kode} value={e.kode}>
              {e.beskrivelse}
            </option>
          ))}
        </Select>

        <div id={fields.merking.id} className="w-72">
          <UNSAFE_Combobox
            label="Merking (valgfritt)"
            options={kodeverk.merker.map((merke) => ({
              value: merke,
              label: merkingEtikett(merke),
            }))}
            isMultiSelect
            allowNewValues
            selectedOptions={valgteMerkinger.map((merke) => ({
              value: merke,
              label: merkingEtikett(merke),
            }))}
            onToggleSelected={(option, isSelected) => {
              setValgteMerkinger((prev) => {
                if (isSelected) return prev.includes(option) ? prev : [...prev, option];
                return prev.filter((m) => m !== option);
              });
            }}
            error={fields.merking.errors?.[0]}
          />
          {valgteMerkinger.map((m) => (
            <input key={m} type="hidden" name="merking" value={m} />
          ))}
        </div>

        <div>
          <UNSAFE_Combobox
            id={fields.arbeidsgivere.id}
            label="Organisasjonsnummer (valgfritt)"
            isMultiSelect
            allowNewValues
            options={[]}
            selectedOptions={valgteArbeidsgivere.map((orgnr) => ({ label: orgnr, value: orgnr }))}
            onToggleSelected={(option, isSelected) => {
              setValgteArbeidsgivere((prev) => {
                if (isSelected && !prev.includes(option)) return [...prev, option];
                if (!isSelected) return prev.filter((v) => v !== option);
                return prev;
              });
            }}
            error={fields.arbeidsgivere.errors?.[0]}
          />
          {valgteArbeidsgivere.map((orgnr) => (
            <input key={orgnr} type="hidden" name="arbeidsgivere" value={orgnr} />
          ))}
        </div>
      </HStack>
    </>
  );
}
