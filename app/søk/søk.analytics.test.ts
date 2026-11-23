import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { klassifiserSøk, søkAnalytics } from "./søk.analytics";

const sporHendelse = vi.hoisted(() => vi.fn());

vi.mock("~/analytics/analytics", () => ({ sporHendelse }));

describe("søk-analytics", () => {
  beforeEach(() => {
    sporHendelse.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["12345678901", "123456 78901", "450190 12345"])(
    "klassifiserer %s som fødsels- eller D-nummer",
    (søketekst) => {
      expect(klassifiserSøk(søketekst)).toBe("Fødsels- eller D-nummer");
    },
  );

  it.each(["987654321", "987 654 321"])("klassifiserer %s som organisasjonsnummer", (søketekst) => {
    expect(klassifiserSøk(søketekst)).toBe("Organisasjonsnummer");
  });

  it.each(["1", "42", "123", "1234", "12 34"])("klassifiserer %s som saksnummer", (søketekst) => {
    expect(klassifiserSøk(søketekst)).toBe("Saksnummer");
  });

  it.each(["12345", "12 345"])("klassifiserer %s som PID", (søketekst) => {
    expect(klassifiserSøk(søketekst)).toBe("PID");
  });

  it.each(["moriarty", "Moriarty", "sherlock", "SHERLOCK", "end credits", " End Credits "])(
    "klassifiserer %s som Easter egg",
    (søketekst) => {
      expect(klassifiserSøk(søketekst)).toBe("Easter egg");
    },
  );

  it.each([
    "",
    "   ",
    "123456",
    "1234567",
    "12345678",
    "1234567890",
    "123456789012",
    "Ola Nordmann",
    "123456-78901",
    "sak-123",
  ])("klassifiserer %j som annet", (søketekst) => {
    expect(klassifiserSøk(søketekst)).toBe("Annet");
  });

  it("sporer bare lukket klassifisering og sender aldri rå søketekst", () => {
    const søk = [
      ["12345678901", "Fødsels- eller D-nummer"],
      ["987654321", "Organisasjonsnummer"],
      ["Ola Nordmann", "Annet"],
      ["end credits", "Easter egg"],
    ] as const;

    for (const [søketekst] of søk) søkAnalytics.utført("hurtigsøk", søketekst);

    for (const [hendelse, data] of sporHendelse.mock.calls) {
      expect(hendelse).toBe("søk utført");
      expect((hendelse as string).length).toBeLessThanOrEqual(50);
      expect(Object.keys(data as Record<string, unknown>).sort()).toEqual([
        "kilde",
        "klassifisering",
      ]);
      expect((data as Record<string, unknown>).kilde).toBe("hurtigsøk");
      expect([
        "Fødsels- eller D-nummer",
        "Organisasjonsnummer",
        "Saksnummer",
        "PID",
        "Easter egg",
        "Annet",
      ]).toContain((data as Record<string, unknown>).klassifisering);
    }

    expect(sporHendelse.mock.calls).toEqual([
      ["søk utført", { kilde: "hurtigsøk", klassifisering: søk[0][1] }],
      ["søk utført", { kilde: "hurtigsøk", klassifisering: søk[1][1] }],
      ["søk utført", { kilde: "hurtigsøk", klassifisering: søk[2][1] }],
      ["søk utført", { kilde: "hurtigsøk", klassifisering: søk[3][1] }],
    ]);

    const argumenter = JSON.stringify(sporHendelse.mock.calls);
    for (const [søketekst] of søk) expect(argumenter).not.toContain(søketekst);
  });
});
