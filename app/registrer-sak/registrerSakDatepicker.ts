function normaliserDato(dato: Date) {
  const normalisertDato = new Date(dato);
  normalisertDato.setHours(0, 0, 0, 0);
  return normalisertDato;
}

export function lagRegistrerSakDatepickerValg(
  senesteValgbareDato = new Date(2100, 11, 31),
) {
  const normalisertSenesteValgbareDato = normaliserDato(senesteValgbareDato);

  return {
    fromDate: new Date(1900, 0, 1),
    toDate: normalisertSenesteValgbareDato,
    disabled: [{ after: normalisertSenesteValgbareDato }],
    dropdownCaption: true,
  };
}
