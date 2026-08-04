import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to md size and Loading label", () => {
    expect(createSpinner()).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("respects an explicit size and label", () => {
    expect(createSpinner({ size: "lg", label: "Please wait" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Please wait"></span>',
    );
  });

  it("escapes & and \" in aria-label", () => {
    expect(createSpinner({ label: `A & "B"` })).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="A &amp; &quot;B&quot;"></span>',
    );
  });
});
