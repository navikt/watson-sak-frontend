import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import SøkSide, { action } from "./SøkSide.route";
import { søkSaker, type SøkResultat } from "./søk.server";

vi.mock("./søk.server", () => ({ søkSaker: vi.fn() }));

const routerMocks = vi.hoisted(() => ({
  actionData: vi.fn(),
  fetcher: vi.fn(),
  rootLoaderData: { envs: { watsonSokUrl: null as string | null }, user: { erLesebruker: false } },
}));

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useActionData: routerMocks.actionData,
  useFetcher: routerMocks.fetcher,
  unstable_useRoute: () => ({ loaderData: routerMocks.rootLoaderData }),
}));

describe("SøkSide action", () => {
  it("returnerer teknisk feil og beholder søketeksten ved søkefeil", async () => {
    vi.mocked(søkSaker).mockRejectedValue(new Error("Teknisk feil"));
    const formData = new FormData();
    formData.set("søketekst", "1028");
    const request = new Request("http://localhost/søk", { method: "POST", body: formData });

    const svar = await action({ request } as Parameters<typeof action>[0]);

    expect(svar).toMatchObject({
      init: { status: 500 },
      data: {
        teknisk: true,
        søketekst: "1028",
        feilId: expect.stringMatching(/^[a-f0-9]{8}$/),
      },
    });
  });
});

describe("SøkSide resultatliste", () => {
  const grunnsak = hentAlleSaker(new Request("http://localhost"))[0];
  const saker = [
    { ...grunnsak, id: 20, opprettet: "2026-01-01T10:00:00Z" },
    { ...grunnsak, id: 10, opprettet: "2026-02-01T10:00:00Z" },
  ];
  let actionData: SøkResultat;
  const submit = vi.fn();
  const sideData = new Map<string, SøkResultat>();

  function lenketekster() {
    return screen.getAllByRole("link").map((lenke) => lenke.textContent);
  }

  function renderSøk() {
    return render(
      <MemoryRouter>
        <SøkSide />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    sideData.clear();
    submit.mockClear();
    routerMocks.rootLoaderData = {
      envs: { watsonSokUrl: null },
      user: { erLesebruker: false },
    };
    actionData = {
      søketekst: "11223344556",
      søketype: "personIdent",
      resultater: saker,
      side: 1,
      totalSider: 2,
      totalAntall: 25,
    };
    routerMocks.actionData.mockImplementation(() => actionData);
    routerMocks.fetcher.mockImplementation((valg?: { key: string }) => ({
      data: valg ? sideData.get(valg.key) : undefined,
      submit,
    }));
  });

  it("viser samme kolonner og bredder som Alle saker og sorterer uten å mutere treffene", () => {
    renderSøk();

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Saksnummer",
      "Kategori",
      "Misbrukstype",
      "Steg",
      "Status",
      "Opprettet",
      "Oppdatert",
      "Saksbehandler",
    ]);
    expect(screen.getAllByRole("columnheader").map((header) => header.className)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("min-w-[100px]"),
        expect.stringContaining("min-w-[210px]"),
        expect.stringContaining("min-w-[200px]"),
      ]),
    );
    expect(lenketekster()).toEqual(["10", "20"]);
    expect(saker.map((sak) => sak.id)).toEqual([20, 10]);
    expect(
      screen.getByRole("button", { name: "Sorter på opprettet" }).closest("th"),
    ).toHaveProperty("ariaSort", "descending");
    expect(screen.queryByRole("button", { name: "Sorter på misbrukstype" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sorter på saksbehandler" })).toBeNull();
  });

  it.each(["saksnummer", "personIdent", "organisasjonsnummer"] as const)(
    "viser ett treff på %s som tabellrad",
    (søketype) => {
      actionData = {
        ...actionData,
        søketype,
        resultater: [saker[0]],
        totalAntall: 1,
        totalSider: 1,
      };
      renderSøk();
      expect(screen.getByRole("table")).toBeDefined();
      expect(screen.queryByRole("article")).toBeNull();
      expect(lenketekster()).toEqual(["20"]);
    },
  );

  it.each(["saksnummer", "personIdent", "organisasjonsnummer"] as const)(
    "viser flere treff på %s i samme tabell, også ved kollisjon mellom saksnummer og PID",
    (søketype) => {
      actionData = { ...actionData, søketype };
      renderSøk();
      expect(screen.getByRole("table")).toBeDefined();
      expect(lenketekster()).toEqual(["10", "20"]);
    },
  );

  it("veksler retning og starter datokolonner synkende og saksid stigende", () => {
    renderSøk();
    fireEvent.click(screen.getByRole("button", { name: "Sorter på opprettet" }));
    expect(lenketekster()).toEqual(["20", "10"]);
    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksnummer" }));
    expect(lenketekster()).toEqual(["10", "20"]);
    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksnummer" }));
    expect(lenketekster()).toEqual(["20", "10"]);
    fireEvent.click(screen.getByRole("button", { name: "Sorter på opprettet" }));
    expect(lenketekster()).toEqual(["10", "20"]);
    expect(submit).not.toHaveBeenCalled();
  });

  it("beholder sortering ved sidebytte og sorterer bare treffene på den siden", () => {
    const visning = renderSøk();
    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksnummer" }));
    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksnummer" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(submit).toHaveBeenCalledWith(
      { søketekst: actionData.søketekst, side: "2" },
      { method: "post", action: "/søk" },
    );
    const nesteSide = {
      ...actionData,
      side: 2,
      resultater: [
        { ...saker[0], id: 30 },
        { ...saker[1], id: 40 },
      ],
    };
    sideData.set(`sok-side-0-${actionData.søketekst}`, nesteSide);
    visning.rerender(
      <MemoryRouter>
        <SøkSide />
      </MemoryRouter>,
    );

    expect(lenketekster()).toEqual(["40", "30"]);
    expect(
      screen.getByRole("button", { name: "Sorter på saksnummer" }).closest("th"),
    ).toHaveProperty("ariaSort", "descending");
    expect(screen.getByText('25 treff for "11223344556"')).toBeDefined();
  });

  it.each(["11223344556", "987654321"])(
    "nullstiller sortering og gammel side ved nytt søk på %s",
    (søketekst) => {
      const visning = renderSøk();
      fireEvent.click(screen.getByRole("button", { name: "Sorter på opprettet" }));
      sideData.set(`sok-side-0-${actionData.søketekst}`, {
        ...actionData,
        side: 2,
        resultater: [{ ...saker[0], id: 99 }],
      });
      actionData = { ...actionData, søketekst };
      visning.rerender(
        <MemoryRouter>
          <SøkSide />
        </MemoryRouter>,
      );

      expect(lenketekster()).toEqual(["10", "20"]);
      expect(screen.queryByRole("link", { name: "99" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Sorter på opprettet" }).closest("th"),
      ).toHaveProperty("ariaSort", "descending");
    },
  );

  it("skjuler opprett sak for lesebruker når personsøket ikke gir treff", () => {
    actionData = {
      ...actionData,
      søketype: "personIdent",
      resultater: [],
      totalSider: 1,
      totalAntall: 0,
    };
    routerMocks.rootLoaderData = {
      envs: { watsonSokUrl: "https://watson-sok.test" },
      user: { erLesebruker: true },
    };

    renderSøk();

    expect(screen.queryByRole("button", { name: "Opprett sak" })).toBeNull();
    expect(screen.getByRole("button", { name: "Slå opp i Watson Søk" })).toBeDefined();
  });
});
