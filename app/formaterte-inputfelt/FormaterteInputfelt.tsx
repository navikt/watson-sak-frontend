import {
  Search,
  TextField,
  type SearchClearEvent,
  type SearchProps,
  type TextFieldProps,
} from "@navikt/ds-react";
import { useState } from "react";
import { formaterFødselsnummer, formaterOrganisasjonsnummer } from "~/utils/string-utils";

function fjernMellomrom(verdi: string): string {
  return verdi.replace(/\s/g, "");
}

function normaliserSøkeverdi(verdi: string): string {
  const utenMellomrom = fjernMellomrom(verdi);
  return /^\d*$/.test(utenMellomrom) ? utenMellomrom : verdi;
}

export function formaterBeløpsverdi(verdi: string): string {
  const uformatert = fjernMellomrom(verdi);
  if (!/^\d+$/.test(uformatert)) return uformatert;
  return uformatert.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formaterFødselsnummerverdi(verdi: string): string {
  const uformatert = fjernMellomrom(verdi);
  if (!/^\d+$/.test(uformatert) || uformatert.length <= 6) return uformatert;
  return `${uformatert.slice(0, 6)} ${uformatert.slice(6)}`;
}

export function formaterSøkeverdi(verdi: string): string {
  const uformatert = normaliserSøkeverdi(verdi);
  if (/^\d{11}$/.test(uformatert)) return formaterFødselsnummer(uformatert);
  if (/^\d{9}$/.test(uformatert)) return formaterOrganisasjonsnummer(uformatert);
  return uformatert;
}

type BeløpsfeltProps = Omit<
  TextFieldProps,
  "defaultValue" | "inputMode" | "name" | "onChange" | "type" | "value"
> & {
  name: string;
  defaultValue?: string | number;
};

export function Beløpsfelt({ name, defaultValue = "", ...props }: BeløpsfeltProps) {
  const [verdi, setVerdi] = useState(() => fjernMellomrom(String(defaultValue)));

  return (
    <>
      <TextField
        {...props}
        inputMode="numeric"
        value={formaterBeløpsverdi(verdi)}
        onChange={(event) => setVerdi(fjernMellomrom(event.target.value))}
      />
      <input type="hidden" name={name} value={verdi} />
    </>
  );
}

type FormatertSøkefeltProps = Omit<
  SearchProps,
  "defaultValue" | "name" | "onChange" | "onClear" | "onSearchClick" | "value"
> & {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onClear?: (event: SearchClearEvent) => void;
  onSearchClick?: (value: string) => void;
  formater: (value: string) => string;
  normaliser: (value: string) => string;
};

function FormatertSøkefelt({
  name,
  value,
  defaultValue = "",
  onChange,
  onClear,
  onSearchClick,
  formater,
  normaliser,
  ...props
}: FormatertSøkefeltProps) {
  const [internVerdi, setInternVerdi] = useState(() => normaliser(defaultValue));
  const uformatertVerdi = normaliser(value ?? internVerdi);

  function oppdaterVerdi(nyVerdi: string) {
    const uformatert = normaliser(nyVerdi);
    if (value === undefined) setInternVerdi(uformatert);
    onChange?.(uformatert);
  }

  function tøm(event: SearchClearEvent) {
    oppdaterVerdi("");
    onClear?.(event);
  }

  return (
    <>
      <Search
        {...props}
        value={formater(uformatertVerdi)}
        onChange={oppdaterVerdi}
        onClear={tøm}
        onSearchClick={(søkeverdi) => onSearchClick?.(normaliser(søkeverdi))}
      />
      <input type="hidden" name={name} value={uformatertVerdi} />
    </>
  );
}

type IdentifikatorSøkefeltProps = Omit<FormatertSøkefeltProps, "formater" | "normaliser">;

export function IdentifikatorSøkefelt(props: IdentifikatorSøkefeltProps) {
  return (
    <FormatertSøkefelt {...props} formater={formaterSøkeverdi} normaliser={normaliserSøkeverdi} />
  );
}

export function FødselsnummerSøkefelt(props: IdentifikatorSøkefeltProps) {
  return (
    <FormatertSøkefelt
      {...props}
      formater={formaterFødselsnummerverdi}
      normaliser={fjernMellomrom}
    />
  );
}
