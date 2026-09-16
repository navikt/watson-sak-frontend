import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Beløpsfelt,
  formaterBeløpsverdi,
  formaterFødselsnummerverdi,
  formaterSøkeverdi,
  FødselsnummerSøkefelt,
  IdentifikatorSøkefelt,
} from "./FormaterteInputfelt";

describe("formatering av inputverdier", () => {
  it("formaterer beløp med mellomrom mellom tusener", () => {
    expect(formaterBeløpsverdi("1234567")).toBe("1 234 567");
    expect(formaterBeløpsverdi("1 234 567")).toBe("1 234 567");
    expect(formaterBeløpsverdi("12a3")).toBe("12a3");
  });

  it("formaterer fødselsnummer etter fødselsdatoen", () => {
    expect(formaterFødselsnummerverdi("01010112345")).toBe("010101 12345");
    expect(formaterFødselsnummerverdi("010101")).toBe("010101");
  });

  it("formaterer bare fullstendige identifikatorer i blandede søk", () => {
    expect(formaterSøkeverdi("01010112345")).toBe("010101 12345");
    expect(formaterSøkeverdi("123456789")).toBe("123 456 789");
    expect(formaterSøkeverdi("12345678")).toBe("12345678");
    expect(formaterSøkeverdi("SAK-123")).toBe("SAK-123");
    expect(formaterSøkeverdi("et søk")).toBe("et søk");
  });
});

describe("Beløpsfelt", () => {
  it("viser formatert beløp og sender inn uformatert verdi", () => {
    const handleSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return new FormData(event.currentTarget);
    });

    render(
      <form onSubmit={handleSubmit}>
        <Beløpsfelt name="beløp" label="Beløp" />
        <button type="submit">Lagre</button>
      </form>,
    );

    const felt = screen.getByLabelText("Beløp") as HTMLInputElement;
    fireEvent.change(felt, { target: { value: "1234567" } });
    expect(felt.value).toBe("1 234 567");

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    const formData = handleSubmit.mock.results[0].value as FormData;
    expect(formData.get("beløp")).toBe("1234567");
  });
});

describe("formaterte søkefelt", () => {
  it("viser formatert fødselsnummer og varsler med uformatert verdi", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FødselsnummerSøkefelt name="fnr" label="Fødselsnummer" value="" onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText("Fødselsnummer"), {
      target: { value: "01010112345" },
    });
    expect(onChange).toHaveBeenLastCalledWith("01010112345");

    rerender(
      <FødselsnummerSøkefelt
        name="fnr"
        label="Fødselsnummer"
        value="01010112345"
        onChange={onChange}
      />,
    );
    expect((screen.getByLabelText("Fødselsnummer") as HTMLInputElement).value).toBe("010101 12345");
  });

  it("sender inn uformatert identifikator fra et ukontrollert søkefelt", () => {
    let formData: FormData | undefined;
    const { container } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          formData = new FormData(event.currentTarget);
        }}
      >
        <IdentifikatorSøkefelt name="søketekst" label="Søk" />
      </form>,
    );

    const felt = screen.getByRole("searchbox", { name: "Søk" }) as HTMLInputElement;
    fireEvent.change(felt, { target: { value: "01010112345" } });
    expect(felt.value).toBe("010101 12345");

    const skjema = container.querySelector("form");
    expect(skjema).not.toBeNull();
    if (!skjema) throw new Error("Forventet å finne skjemaet");
    fireEvent.submit(skjema);
    expect(formData?.get("søketekst")).toBe("01010112345");
  });
});
