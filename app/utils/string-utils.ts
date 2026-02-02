/**
 * Gjør første bokstav stor og resten små
 *
 * @param tekst - Teksten som skal ha stor første bokstav
 * @returns Tekst med stor første bokstav
 */
export function storFørsteBokstav(tekst: string | null | undefined): string {
  if (!tekst) {
    return "";
  }

  const førsteBokstav = tekst.charAt(0).toUpperCase();
  const restAvTeksten = tekst.slice(1).toLowerCase();

  return førsteBokstav + restAvTeksten;
}

/**
 * Gjør første bokstav stor i hvert ord
 *
 * @param tekst - Teksten som skal ha stor første bokstav per ord
 * @param inkluderBindestrek - Om bindestrek skal behandles som orddelimeter (default: false)
 * @returns Tekst med stor første bokstav per ord
 */
export function storFørsteBokstavPerOrd(
  tekst: string | null | undefined,
  inkluderBindestrek: boolean = false,
) {
  if (!tekst) {
    return "";
  }

  if (inkluderBindestrek) {
    return tekst
      .split(/([- ])/g)
      .map((part, i) => (i % 2 === 0 ? storFørsteBokstav(part) : part))
      .join("");
  }
  return tekst.split(" ").map(storFørsteBokstav).join(" ");
}

/**
 * Konverterer camelCase til en norsk setning med stor første bokstav
 *
 * @param camelCaseStr - camelCase-teksten som skal konverteres
 * @returns Norsk tekst med stor første bokstav
 */
export function camelCaseTilNorsk(camelCaseStr: string | null) {
  if (!camelCaseStr) {
    return "";
  }

  const ord = camelCaseStr
    .replace(/([a-zæøå])([A-ZÆØÅ])/g, "$1 $2")
    .toLowerCase()
    .split(" ");

  // Bytt ut ae, aa og oe med æ, å og ø
  const norskeOrd = ord.map((hvertOrd) =>
    hvertOrd.replace(/oe/g, "ø").replace(/aa/g, "å").replace(/ae/g, "æ"),
  );

  return storFørsteBokstav(norskeOrd.join(" "));
}

/**
 * Konverterer snake_case til en norsk setning med stor første bokstav
 *
 * @param snakeCaseStr - snake_case-teksten som skal konverteres
 * @returns Norsk tekst med stor første bokstav
 */
export function snakeCaseTilSetning(snakeCaseStr: string | null) {
  if (!snakeCaseStr) {
    return "";
  }

  const [førsteOrd, ...restenAvOrdene] = snakeCaseStr.split("_");
  return [
    storFørsteBokstav(førsteOrd),
    restenAvOrdene.map((s) => s.toLowerCase()).join(" "),
  ]
    .join(" ")
    .trim();
}

/**
 * Formaterer fødselsnummer til å ha mellomrom mellom de seks første og de fem siste sifrene
 *
 * @param fødselsnummer - Fødselsnummer som skal formateres
 * @returns Formatert fødselsnummer
 */
export function formaterFødselsnummer(fødselsnummer: string | null): string {
  if (!fødselsnummer || fødselsnummer.length !== 11) {
    return fødselsnummer ?? "";
  }

  return fødselsnummer.slice(0, 6) + " " + fødselsnummer.slice(6);
}
