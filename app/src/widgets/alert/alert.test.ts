import { describe, expect, it } from "vitest";
import { createAlert, type AlertProps } from "./alert.js";
import { create } from "../../core/registry.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Saved" })).toBe('<div class="alert alert--info">Saved</div>');
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Failed", tone: "error" })).toBe(
      '<div class="alert alert--error">Failed</div>',
    );
  });

  it("escapes HTML in the message", () => {
    expect(createAlert({ message: '<script>alert("x")</script>' })).toBe(
      '<div class="alert alert--info">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</div>',
    );
  });

  it("falls back to info for an invalid tone", () => {
    expect(createAlert({ message: "Saved", tone: "danger" as AlertProps["tone"] })).toBe(
      '<div class="alert alert--info">Saved</div>',
    );
  });

  it("throws a clear TypeError via create() when message is missing", () => {
    expect(() => create("alert", {})).toThrow(/message.*must be a string/);
  });

  it("throws a clear TypeError via create() when message is the wrong type", () => {
    expect(() => create("alert", { message: 42 })).toThrow(/message.*must be a string/);
  });
});
