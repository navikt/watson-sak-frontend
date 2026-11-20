import { describe, expect, it } from "vitest";
import { finnOppgavetypenavn } from "./oppgavetypenavn";

const kodeverk = {
  gjelderverdier: [],
  oppgavetyper: [{ oppgavetype: "VURD_BREV", term: "Vurder brev fra Gosys" }],
};

describe("finnOppgavetypenavn", () => {
  it("bruker termen fra kodeverket når den finnes", () => {
    expect(finnOppgavetypenavn("VURD_BREV", kodeverk)).toBe("Vurder brev fra Gosys");
  });

  it("faller tilbake på reservelisten når kodeverket mangler typen", () => {
    expect(finnOppgavetypenavn("JFR", kodeverk)).toBe("Journalføring");
  });

  it("faller tilbake på reservelisten uten kodeverk", () => {
    expect(finnOppgavetypenavn("VURD_BREV")).toBe("Vurder brev");
  });

  it("viser ukjent kode som den er", () => {
    expect(finnOppgavetypenavn("UKJENT")).toBe("UKJENT");
  });
});
