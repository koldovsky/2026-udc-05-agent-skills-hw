import { describe, expect, it } from "vitest";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Hello" })).toBe('<div class="alert alert--info">Hello</div>');
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Something went wrong", tone: "error" })).toBe(
      '<div class="alert alert--error">Something went wrong</div>',
    );
  });
});
