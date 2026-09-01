import { describe, expect, it } from "vitest";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Hello" })).toBe('<div class="alert alert--info">Hello</div>');
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Oops", tone: "error" })).toBe(
      '<div class="alert alert--error">Oops</div>',
    );
  });

  it("renders warn tone", () => {
    expect(createAlert({ message: "Watch out", tone: "warn" })).toBe(
      '<div class="alert alert--warn">Watch out</div>',
    );
  });
});
