import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to medium size and normal speed", () => {
    expect(createSpinner()).toBe('<div class="spinner spinner--md spinner--normal"></div>');
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ size: "lg" })).toBe(
      '<div class="spinner spinner--lg spinner--normal"></div>',
    );
  });

  it("respects an explicit speed", () => {
    expect(createSpinner({ speed: "fast" })).toBe(
      '<div class="spinner spinner--md spinner--fast"></div>',
    );
  });

  it("respects both size and speed", () => {
    expect(createSpinner({ size: "sm", speed: "slow" })).toBe(
      '<div class="spinner spinner--sm spinner--slow"></div>',
    );
  });
});
