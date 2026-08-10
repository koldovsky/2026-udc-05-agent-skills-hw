import { describe, expect, it } from "vitest";
import { create } from "../index.js";
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

describe("create('spinner')", () => {
  it("rejects invalid size", () => {
    expect(() => create("spinner", { size: "xl" })).toThrow(/Invalid spinner size/);
  });

  it("rejects non-string label", () => {
    expect(() => create("spinner", { label: 42 })).toThrow(/Spinner label must be a string/);
  });

  it("escapes HTML-special characters in label", () => {
    expect(create("spinner", { label: `"><img src=x onerror=alert(1)>` })).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"></span>',
    );
  });
});
