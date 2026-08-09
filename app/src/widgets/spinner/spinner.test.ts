import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the medium size", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "lg" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Loading"></span>',
    );
  });

  it("uses a custom label", () => {
    expect(createSpinner({ size: "sm", label: "Saving" })).toBe(
      '<span class="spinner spinner--sm" role="status" aria-label="Saving"></span>',
    );
  });
});
