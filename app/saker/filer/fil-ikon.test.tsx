import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilIkon } from "./fil-ikon";
import type { FilNode, FilType } from "./typer";

function lagFil(format: FilType): FilNode {
  return {
    id: "test",
    type: "fil",
    navn: "test.txt",
    format,
    endretAv: "Test",
    endretDato: "2026-01-01",
    sharepointUrl: "https://example.com",
  };
}

describe("FilIkon", () => {
  it("rendrer FolderIcon for mapper", () => {
    const mappe: FilNode = {
      id: "mappe-1",
      type: "mappe",
      navn: "Mappe",
      sharepointUrl: "https://example.com",
      barn: [],
    };
    const { container } = render(<FilIkon node={mappe} data-testid="ikon" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it.each([
    "word",
    "excel",
    "pdf",
    "powerpoint",
    "bilde",
    "csv",
    "json",
    "kode",
    "tekst",
    "annet",
  ] as const)("rendrer et ikon for filtype '%s'", (format) => {
    const fil = lagFil(format);
    const { container } = render(<FilIkon node={fil} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
