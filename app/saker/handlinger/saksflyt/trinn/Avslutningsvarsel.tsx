import { LocalAlert } from "@navikt/ds-react";

/** Varsler om at saken ikke kan gjenåpnes, og at dokumenter som ikke er journalført bare kan leses i 30 dager. */
export function Avslutningsvarsel() {
  return (
    <LocalAlert status="warning">
      <LocalAlert.Header>
        <LocalAlert.Title as="h2">Tilgang til dokumenter og underlag</LocalAlert.Title>
      </LocalAlert.Header>
      <LocalAlert.Content>
        Når du avslutter saken, kan du ikke gjenåpne den. Du og de saken er delt med kan lese
        dokumenter og filer som ikke er journalført i 30 dager. Ingen kan endre eller kommentere
        dem. Etter 30 dager er bare journalførte dokumenter tilgjengelige.
      </LocalAlert.Content>
    </LocalAlert>
  );
}
