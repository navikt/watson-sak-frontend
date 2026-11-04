import { erTekniskFeilSvar } from "~/feilhåndtering/Innsendingsfeil";

/** Feil-ID fra et mislykket lagresvar, hvis actionen svarte med teknisk feil. */
export async function hentTekniskFeilId(respons: Response): Promise<string | undefined> {
  const svar: unknown = await respons.json().catch(() => null);
  return erTekniskFeilSvar(svar) ? svar.feilId : undefined;
}
