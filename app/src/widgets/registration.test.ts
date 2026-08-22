import { describe, expect, it } from "vitest";
import { create, listWidgets } from "./index.js";

describe("widget registration", () => {
  it("registers badge so it is reachable by name", () => {
    expect(listWidgets()).toContain("badge");
    expect(create("badge", { label: "New" })).toBe('<span class="badge badge--info">New</span>');
  });

  it("registers alert so it is reachable by name", () => {
    expect(listWidgets()).toContain("alert");
    expect(create("alert", { message: "Saved" })).toBe(
      '<div class="alert alert--info">Saved</div>',
    );
  });
});