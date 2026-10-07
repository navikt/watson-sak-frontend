import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import OpprettSakSide from "./RegistrerSakSide.route";

const state = vi.hoisted(() => ({
  miljø: "local-backend",
  legacyPid: null as string | null,
  legacyKilde: null as string | null,
}));
vi.mock("~/miljø/useMiljø", () => ({ useMiljø: () => state.miljø }));
vi.mock("~/kodeverk/useKodeverk", () => ({ useKodeverk: () => mockKodeverk }));
vi.mock("~/feature-toggling/useFeatureFlagg", () => ({ useEnkeltFeatureFlagg: () => false }));
vi.mock("./RegistrerSakSide.server", () => ({
  loader: () => ({ fnr: null, legacyPid: null, legacyKilde: null }),
  action: vi.fn(),
}));
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useFetcher: () => ({
      Form: actual.Form,
      state: "idle",
      data: {
        person: {
          navn: "Testperson",
          personnummer: "11111111111",
          alder: 42,
          adresseskjermet: false,
          kanOppretteSak: true,
        },
        eksisterendeSaker: [],
      },
      submit: vi.fn(),
    }),
  };
});

function renderSide() {
  const router = createMemoryRouter(
    [
      {
        path: "/registrer-sak",
        Component: OpprettSakSide,
        loader: () => ({ fnr: null, legacyPid: state.legacyPid, legacyKilde: state.legacyKilde }),
      },
    ],
    { initialEntries: ["/registrer-sak"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("Notat i Opprett sak", () => {
  beforeEach(() => {
    state.miljø = "local-backend";
    state.legacyPid = null;
    state.legacyKilde = null;
  });

  it.each(["local-mock", "local-backend"])(
    "viser et redigerbart Notat-felt for migreringssaker i %s",
    async (miljø) => {
      state.miljø = miljø;
      state.legacyPid = "100245";
      state.legacyKilde = "UTREDNING";
      renderSide();
      const notat = await screen.findByRole("textbox", { name: "Notat" });
      expect((notat as HTMLTextAreaElement).disabled).toBe(false);
      expect((notat as HTMLTextAreaElement).name).toBe("notat");
    },
  );

  it("viser ikke Notat for vanlige saker", async () => {
    renderSide();
    await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });
    expect(screen.queryByRole("textbox", { name: "Notat" })).toBeNull();
  });

  it.each([
    { legacyPid: "100245", legacyKilde: null },
    { legacyPid: null, legacyKilde: "UTREDNING" },
  ])(
    "viser ikke Notat når migreringsnøkkelen er ufullstendig",
    async ({ legacyPid, legacyKilde }) => {
      state.legacyPid = legacyPid;
      state.legacyKilde = legacyKilde;
      renderSide();
      await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });
      expect(screen.queryByRole("textbox", { name: "Notat" })).toBeNull();
    },
  );

  it("beholder Notat, PID og kobling når loaderen revalideres uten cookie", async () => {
    // Cookien fra migreringslisten er engangs. Person-oppslaget revaliderer loaderen, og da kommer
    // loaderen tilbake uten migreringsnøkkel. Notat-feltet skal likevel bli stående.
    let kall = 0;
    const router = createMemoryRouter(
      [
        {
          path: "/registrer-sak",
          Component: OpprettSakSide,
          loader: () => {
            kall += 1;
            return kall === 1
              ? { fnr: null, legacyPid: "100245", legacyKilde: "UTREDNING" }
              : { fnr: null, legacyPid: null, legacyKilde: null };
          },
        },
      ],
      { initialEntries: ["/registrer-sak"] },
    );
    const { container } = render(<RouterProvider router={router} />);
    await screen.findByRole("textbox", { name: "Notat" });

    await act(async () => {
      await router.revalidate();
    });

    expect(kall).toBeGreaterThan(1);
    expect(screen.getByRole("textbox", { name: "Notat" })).not.toBeNull();
    expect(screen.getByText(/PID: 100245/)).not.toBeNull();
    expect(container.querySelector('input[name="legacyPid"]')).not.toBeNull();
    expect(container.querySelector('input[name="legacyKilde"]')).not.toBeNull();
  });
});

async function velgISelect(select: HTMLSelectElement, verdi: string) {
  // Som i nettleseren: input-eventet kommer før change, med mikrooppgaver imellom.
  await act(async () => {
    select.value = verdi;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("Nedtrekksfelt i Opprett sak", () => {
  beforeEach(() => {
    state.miljø = "local-backend";
    state.legacyPid = null;
    state.legacyKilde = null;
  });

  it("lar saksbehandler velge verdier etter en valideringsfeil", async () => {
    renderSide();
    await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });

    await act(async () => {
      screen.getByRole("button", { name: "Opprett sak" }).click();
    });
    await screen.findByText("Du må rette disse feilene før du kan gå videre");

    const kategori = screen.getByRole("combobox", { name: "Kategori" }) as HTMLSelectElement;
    const kilde = screen.getByRole("combobox", { name: "Kilde" }) as HTMLSelectElement;
    const enhet = screen.getByRole("combobox", { name: "Enhet" }) as HTMLSelectElement;

    const [valgtKategori] = mockKodeverk.kategorier;
    const [valgtKilde] = mockKodeverk.kilder;
    const [valgtEnhet] = mockKodeverk.enheter;
    if (!valgtKategori || !valgtKilde || !valgtEnhet) throw new Error("Mangler kodeverk");

    await velgISelect(kategori, valgtKategori.kode);
    expect(
      (screen.getByRole("combobox", { name: "Misbruktype" }) as HTMLInputElement).disabled,
    ).toBe(false);
    await velgISelect(kilde, valgtKilde.kode);
    await velgISelect(enhet, valgtEnhet.kode);

    expect(kategori.value).toBe(valgtKategori.kode);
    expect(kilde.value).toBe(valgtKilde.kode);
    expect(enhet.value).toBe(valgtEnhet.kode);
  });

  it("fyller ut nedtrekksfeltene med en tilfeldig sak", async () => {
    renderSide();
    const knapp = await screen.findByRole("button", { name: "Fyll ut en tilfeldig sak" });

    await act(async () => {
      knapp.click();
    });

    for (const navn of ["Kategori", "Kilde", "Enhet"]) {
      const select = screen.getByRole("combobox", { name: navn }) as HTMLSelectElement;
      expect(select.value).not.toBe("");
    }
  });
});
