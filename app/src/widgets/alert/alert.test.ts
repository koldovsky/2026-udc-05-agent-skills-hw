import { describe, expect, it } from "vitest";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "This is an info message" })).toBe(
      '<div class="alert alert--info">This is an info message</div>',
    );
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "This is an error", tone: "error" })).toBe(
      '<div class="alert alert--error">This is an error</div>',
    );
  });
});
