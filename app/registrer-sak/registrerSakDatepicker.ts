function normaliserDato(dato: Date) {
  const normalisertDato = new Date(dato);
  normalisertDato.setHours(0, 0, 0, 0);
  return normalisertDato;
}

function trekkFraTiÅr(dato: Date) {
  const datoTiÅrTilbake = new Date(dato);
  datoTiÅrTilbake.setFullYear(datoTiÅrTilbake.getFullYear() - 10);
  return datoTiÅrTilbake;
}

export function lagRegistrerSakDatepickerValg(senesteValgbareDato = new Date(2100, 11, 31)) {
  const normalisertSenesteValgbareDato = normaliserDato(senesteValgbareDato);
  const tidligsteValgbareDato = trekkFraTiÅr(normalisertSenesteValgbareDato);

  return {
    fromDate: tidligsteValgbareDato,
    toDate: normalisertSenesteValgbareDato,
    disabled: [{ before: tidligsteValgbareDato }, { after: normalisertSenesteValgbareDato }],
    dropdownCaption: true,
  };
}
