import { describe, expect, it } from "vitest";
import { migreringErÅpen } from "./miljo";

describe("migreringErÅpen", () => {
  it.each(["local-backend", "dev"])("er åpen i %s", (miljø) => {
    expect(migreringErÅpen(miljø)).toBe(true);
  });

  it.each(["prod", "demo", "local-mock", "local-dev", undefined])("er stengt i %s", (miljø) => {
    expect(migreringErÅpen(miljø)).toBe(false);
  });
});
