import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the medium size", () => {
    expect(createSpinner({})).toBe('<span class="spinner spinner--medium"></span>');
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "large" })).toBe('<span class="spinner spinner--large"></span>');
  });
});
