import { describe, expect, it } from "vitest";
import {
  erAktivSak,
  erAktivSakKontrollsak,
  hentNesteStatus,
  hentNesteStatusKontrollsak,
  kanPolitianmeldes,
  kanVideresendesTilNayNfp,
} from "./tilgjengeligeHandlinger";

describe("hentNesteStatus", () => {
  it("returnerer 'tips avklart' for 'tips mottatt'", () => {
    expect(hentNesteStatus("tips mottatt")).toBe("tips avklart");
  });

  it("returnerer 'under utredning' for 'tips avklart'", () => {
    expect(hentNesteStatus("tips avklart")).toBe("under utredning");
  });

  it("returnerer 'avsluttet' for 'under utredning'", () => {
    expect(hentNesteStatus("under utredning")).toBe("avsluttet");
  });

  it("returnerer null for 'avsluttet'", () => {
    expect(hentNesteStatus("avsluttet")).toBeNull();
  });

  it("returnerer null for 'henlagt'", () => {
    expect(hentNesteStatus("henlagt")).toBeNull();
  });
});

describe("erAktivSak", () => {
  it("returnerer true for 'tips mottatt'", () => {
    expect(erAktivSak("tips mottatt")).toBe(true);
  });

  it("returnerer true for 'tips avklart'", () => {
    expect(erAktivSak("tips avklart")).toBe(true);
  });

  it("returnerer true for 'under utredning'", () => {
    expect(erAktivSak("under utredning")).toBe(true);
  });

  it("returnerer false for 'avsluttet'", () => {
    expect(erAktivSak("avsluttet")).toBe(false);
  });

  it("returnerer false for 'henlagt'", () => {
    expect(erAktivSak("henlagt")).toBe(false);
  });

  it("returnerer false for 'videresendt til nay/nfp'", () => {
    expect(erAktivSak("videresendt til nay/nfp")).toBe(false);
  });

  it("returnerer false for 'politianmeldt'", () => {
    expect(erAktivSak("politianmeldt")).toBe(false);
  });
});

describe("kanVideresendesTilNayNfp", () => {
  it("returnerer true for 'under utredning'", () => {
    expect(kanVideresendesTilNayNfp("under utredning")).toBe(true);
  });

  it("returnerer false for 'tips mottatt'", () => {
    expect(kanVideresendesTilNayNfp("tips mottatt")).toBe(false);
  });

  it("returnerer false for 'tips avklart'", () => {
    expect(kanVideresendesTilNayNfp("tips avklart")).toBe(false);
  });

  it("returnerer false for 'avsluttet'", () => {
    expect(kanVideresendesTilNayNfp("avsluttet")).toBe(false);
  });

  it("returnerer false for 'henlagt'", () => {
    expect(kanVideresendesTilNayNfp("henlagt")).toBe(false);
  });

  it("returnerer false for 'videresendt til nay/nfp'", () => {
    expect(kanVideresendesTilNayNfp("videresendt til nay/nfp")).toBe(false);
  });

  it("returnerer false for 'politianmeldt'", () => {
    expect(kanVideresendesTilNayNfp("politianmeldt")).toBe(false);
  });
});

describe("kanPolitianmeldes", () => {
  it("returnerer true for 'under utredning'", () => {
    expect(kanPolitianmeldes("under utredning")).toBe(true);
  });

  it("returnerer false for 'tips mottatt'", () => {
    expect(kanPolitianmeldes("tips mottatt")).toBe(false);
  });

  it("returnerer false for 'tips avklart'", () => {
    expect(kanPolitianmeldes("tips avklart")).toBe(false);
  });

  it("returnerer false for 'avsluttet'", () => {
    expect(kanPolitianmeldes("avsluttet")).toBe(false);
  });

  it("returnerer false for 'henlagt'", () => {
    expect(kanPolitianmeldes("henlagt")).toBe(false);
  });

  it("returnerer false for 'videresendt til nay/nfp'", () => {
    expect(kanPolitianmeldes("videresendt til nay/nfp")).toBe(false);
  });

  it("returnerer false for 'politianmeldt'", () => {
    expect(kanPolitianmeldes("politianmeldt")).toBe(false);
  });
});

describe("Kontrollsak-statusregler", () => {
  it("behandler OPPRETTET som aktiv sak", () => {
    expect(erAktivSakKontrollsak("OPPRETTET")).toBe(true);
  });

  it("behandler AVSLUTTET som inaktiv sak", () => {
    expect(erAktivSakKontrollsak("AVSLUTTET")).toBe(false);
  });

  it("finner neste status for OPPRETTET", () => {
    expect(hentNesteStatusKontrollsak("OPPRETTET")).toBe("AVKLART");
  });

  it("finner neste status for AVKLART", () => {
    expect(hentNesteStatusKontrollsak("AVKLART")).toBe("UTREDES");
  });

  it("returnerer null for HENLAGT", () => {
    expect(hentNesteStatusKontrollsak("HENLAGT")).toBeNull();
  });
});
