import { describe, expect, it } from "vitest";
import { createAlert, type AlertProps } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Heads up" })).toBe(
      '<div class="alert alert--info">Heads up</div>',
    );
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Careful", tone: "warn" })).toBe(
      '<div class="alert alert--warn">Careful</div>',
    );
  });

  it("escapes the message for HTML text", () => {
    expect(createAlert({ message: '<script>alert("x")</script>' })).toBe(
      '<div class="alert alert--info">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</div>',
    );
  });

  it("requires a message at runtime", () => {
    expect(() => createAlert({} as AlertProps)).toThrow(
      "Alert message is required and must be a string",
    );
  });

  it("rejects invalid tones at runtime", () => {
    expect(() =>
      createAlert(
        { message: "Careful", tone: "critical" } as unknown as AlertProps,
      ),
    ).toThrow("Alert tone must be one of: info, warn, error");
  });
});
