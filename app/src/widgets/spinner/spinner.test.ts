import { describe, expect, it } from "vitest";
import { create, listWidgets } from "../index.js";

describe("spinner widget registration", () => {
  it("is discoverable through the public widget registry path", () => {
    expect(listWidgets()).toContain("spinner");
  });

  it("creates the default spinner through the public widget registry path", () => {
    expect(create("spinner")).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("creates an explicit spinner through the public widget registry path", () => {
    expect(create("spinner", { label: "Saving", size: "lg" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Saving"></span>',
    );
  });

  it("escapes the label for an HTML attribute", () => {
    expect(create("spinner", { label: 'Save "now" & close', size: "sm" })).toBe(
      '<span class="spinner spinner--sm" role="status" aria-label="Save &quot;now&quot; &amp; close"></span>',
    );
  });

  it("rejects invalid sizes at runtime", () => {
    expect(() => create("spinner", { size: "xl" })).toThrow(
      "Spinner size must be one of: sm, md, lg",
    );
  });
});
