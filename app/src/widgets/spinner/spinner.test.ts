import { describe, expect, it } from "vitest";
import { createSpinner, type SpinnerProps } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the md size and the Loading label", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "lg" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Loading"></span>',
    );
  });

  it("respects an explicit label", () => {
    expect(createSpinner({ label: "Saving report" })).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Saving report"></span>',
    );
  });

  it("escapes quotes in the label so the attribute cannot be broken out of", () => {
    expect(createSpinner({ label: `" onmouseover="steal()` })).toBe(
      '<span class="spinner spinner--md" role="status" ' +
        'aria-label="&quot; onmouseover=&quot;steal()"></span>',
    );
  });

  it("falls back to the md size for a value that is not a known size", () => {
    const props = { size: '" onload="x' } as unknown as SpinnerProps;
    expect(createSpinner(props)).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });
});