import { describe, expect, it } from "vitest";
import { listWidgets, create } from "../../index.js";

describe("alert widget", () => {
  it("is discoverable via listWidgets", () => {
    expect(listWidgets()).toContain("alert");
  });

  it("renders with default info tone", () => {
    const result = create("alert", { message: "Hello" });
    expect(result).toBe('<div class="alert alert--info">Hello</div>');
  });

  it("renders with explicit tone", () => {
    const result = create("alert", { message: "Danger", tone: "error" });
    expect(result).toBe('<div class="alert alert--error">Danger</div>');
  });

  it("escapes HTML in message", () => {
    const result = create("alert", { message: "<script>alert('xss')</script>" });
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("rejects invalid tone and defaults to info", () => {
    const result = create("alert", { message: "Test", tone: "invalid" as any });
    expect(result).toContain("alert--info");
  });

  it("throws when props is null", () => {
    expect(() => create("alert", null as any)).toThrow(
      "alert: props must be an object",
    );
  });

  it("throws when message is not a string", () => {
    expect(() => create("alert", { message: null } as any)).toThrow(
      "alert: message must be a string, got object",
    );
  });

  it("throws when message is missing", () => {
    expect(() => create("alert", {} as any)).toThrow(
      "alert: message must be a string, got undefined",
    );
  });
});
