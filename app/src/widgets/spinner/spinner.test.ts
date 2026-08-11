import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to a medium size with a default label", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--medium" role="status" aria-label="Loading…"></span>',
    );
  });

  it("respects an explicit size and label", () => {
    expect(createSpinner({ size: "large", label: "Fetching data" })).toBe(
      '<span class="spinner spinner--large" role="status" aria-label="Fetching data"></span>',
    );
  });
});
