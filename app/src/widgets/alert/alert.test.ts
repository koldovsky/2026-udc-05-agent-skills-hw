import { describe, expect, it } from "vitest";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Saved" })).toBe(
      '<div class="alert alert--info">Saved</div>',
    );
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Disk full", tone: "error" })).toBe(
      '<div class="alert alert--error">Disk full</div>',
    );
  });
});
