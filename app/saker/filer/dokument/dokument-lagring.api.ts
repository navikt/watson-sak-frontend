/**
 * 🔴 JSON-rute for lagring av dokumenter. Gjenbruker actionen til dokumentsiden uendret, med
 * samme tilgangssjekk og validering. Som ressursrute svarer den med JSON også ved feil, så
 * editoren kan lese feil-ID-en. Sideruten svarer med HTML.
 */
export { action } from "./DokumentSide.server";
