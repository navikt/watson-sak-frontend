import { describe, expect, it } from "vitest";
import { filnavnSchema, medNyttFilnavn, splittFilnavn } from "./filnavn-utils";

describe("filnavn-utils", () => {
  it("skiller ut siste endelse", () => {
    expect(splittFilnavn("dokument.pdf")).toEqual({ navn: "dokument", endelse: ".pdf" });
    expect(splittFilnavn("arkiv.tar.gz")).toEqual({ navn: "arkiv.tar", endelse: ".gz" });
  });

  it("behandler filer uten endelse og skjulte filer som navn uten endelse", () => {
    expect(splittFilnavn("README")).toEqual({ navn: "README", endelse: "" });
    expect(splittFilnavn(".gitignore")).toEqual({ navn: ".gitignore", endelse: "" });
    expect(splittFilnavn("rapport.")).toEqual({ navn: "rapport.", endelse: "" });
  });

  it("bevarer endelsen når navnet endres", () => {
    expect(medNyttFilnavn("dokument.pdf", "  nytt navn  ")).toBe("nytt navn.pdf");
  });

  it.each(["", " ", ".", "..", "mappe/fil", "mappe\\fil", "linje\nnavn"])(
    "avviser ugyldig navn %j",
    (navn) => {
      expect(filnavnSchema.safeParse(navn).success).toBe(false);
    },
  );
});
