import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the md size", () => {
    expect(createSpinner({})).toBe('<span class="spinner spinner--md"></span>');
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "lg" })).toBe('<span class="spinner spinner--lg"></span>');
  });
});
