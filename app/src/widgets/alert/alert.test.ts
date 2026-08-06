import { describe, expect, it } from "vitest";
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

  it("escapes HTML-special characters in message", () => {
    expect(createAlert({ message: `<script>&"'` })).toBe(
      '<div class="alert alert--info">&lt;script&gt;&amp;&quot;&#39;</div>',
    );
  });
});
