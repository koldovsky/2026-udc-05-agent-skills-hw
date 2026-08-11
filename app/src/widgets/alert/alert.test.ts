import { describe, expect, it } from "vitest";
import { createAlert, type AlertProps } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Saved" })).toBe('<div class="alert alert--info">Saved</div>');
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Gone", tone: "error" })).toBe(
      '<div class="alert alert--error">Gone</div>',
    );
  });

  it("escapes HTML in the message", () => {
    expect(createAlert({ message: `</div><img src=x onerror="alert(1)">` })).toBe(
      '<div class="alert alert--info">' +
        "&lt;/div&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;" +
        "</div>",
    );
  });

  it("falls back to the info tone for a value that is not a known tone", () => {
    // Reachable from JS via create(), where props are Record<string, unknown>.
    const props = { message: "Hi", tone: '" onload="x' } as unknown as AlertProps;
    expect(createAlert(props)).toBe('<div class="alert alert--info">Hi</div>');
  });
});