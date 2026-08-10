import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to medium size and a default label", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--medium" role="status" aria-label="Loading…"></span>',
    );
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "large" })).toBe(
      '<span class="spinner spinner--large" role="status" aria-label="Loading…"></span>',
    );
  });

  it("respects an explicit label", () => {
    expect(createSpinner({ label: "Saving…" })).toBe(
      '<span class="spinner spinner--medium" role="status" aria-label="Saving…"></span>',
    );
  });
});
