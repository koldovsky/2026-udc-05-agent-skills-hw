import { describe, expect, it } from "vitest";
import { create, listWidgets } from "../../core/registry.js";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Heads up" })).toBe('<div class="alert alert--info">Heads up</div>');
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Danger", tone: "error" })).toBe(
      '<div class="alert alert--error">Danger</div>',
    );
  });

  it("is discoverable via registry list", () => {
    expect(listWidgets()).toContain("alert");
  });

  it("can be created from registry by widget name", () => {
    expect(create("alert", { message: "Heads up" })).toBe(
      '<div class="alert alert--info">Heads up</div>',
    );
  });
});


