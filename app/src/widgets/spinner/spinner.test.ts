import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the md size and a Loading label", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("respects an explicit size and label", () => {
    expect(createSpinner({ size: "lg", label: "Saving" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Saving"></span>',
    );
  });
});
