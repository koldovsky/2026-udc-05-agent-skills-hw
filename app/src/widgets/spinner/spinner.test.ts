import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the md size and the Loading label", () => {
    expect(createSpinner({})).toBe(
      '<span class="spinner spinner--md" role="status" aria-label="Loading"></span>',
    );
  });

  it("is callable with no argument at all", () => {
    expect(createSpinner()).toBe(createSpinner({}));
  });

  it("respects an explicit size and label", () => {
    expect(createSpinner({ size: "lg", label: "Uploading" })).toBe(
      '<span class="spinner spinner--lg" role="status" aria-label="Uploading"></span>',
    );
  });

  it("escapes HTML-significant characters in the label", () => {
    expect(createSpinner({ label: `" onmouseover="x` })).toBe(
      '<span class="spinner spinner--md" role="status" ' +
        'aria-label="&quot; onmouseover=&quot;x"></span>',
    );
    expect(createSpinner({ label: "Tom & <b>Jerry</b>'s" })).toBe(
      '<span class="spinner spinner--md" role="status" ' +
        'aria-label="Tom &amp; &lt;b&gt;Jerry&lt;/b&gt;&#39;s"></span>',
    );
  });
});
