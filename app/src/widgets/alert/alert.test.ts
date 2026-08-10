import { describe, expect, it } from "vitest";
import { create } from "../index.js";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Hello" })).toBe(
      '<div class="alert alert--info">Hello</div>',
    );
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Danger", tone: "error" })).toBe(
      '<div class="alert alert--error">Danger</div>',
    );
  });
});

describe("create('alert')", () => {
  it("rejects non-string message", () => {
    expect(() => create("alert", { message: 123 })).toThrow(/Alert message must be a string/);
  });

  it("rejects invalid tone", () => {
    expect(() => create("alert", { message: "Hi", tone: "critical" })).toThrow(
      /Invalid alert tone/,
    );
  });

  it("escapes HTML-special characters in message", () => {
    expect(create("alert", { message: `<img src=x onerror="alert(1)">` })).toBe(
      '<div class="alert alert--info">&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</div>',
    );
  });
});
