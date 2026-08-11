import { describe, expect, it } from "vitest";
import { createBadge, type BadgeProps } from "./badge.js";

describe("createBadge", () => {
  it("defaults to the info tone", () => {
    expect(createBadge({ label: "New" })).toBe('<span class="badge badge--info">New</span>');
  });

  it("respects an explicit tone", () => {
    expect(createBadge({ label: "Danger", tone: "error" })).toBe(
      '<span class="badge badge--error">Danger</span>',
    );
  });

  it("escapes HTML in the label", () => {
    expect(createBadge({ label: `<script>alert(1)</script>` })).toBe(
      '<span class="badge badge--info">&lt;script&gt;alert(1)&lt;/script&gt;</span>',
    );
  });

  it("falls back to the info tone for a value that is not a known tone", () => {
    const props = { label: "Hi", tone: '" onload="x' } as unknown as BadgeProps;
    expect(createBadge(props)).toBe('<span class="badge badge--info">Hi</span>');
  });
});
