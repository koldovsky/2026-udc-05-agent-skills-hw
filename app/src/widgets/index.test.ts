import { expect, it } from "vitest";
import { create, listWidgets } from "./index.js";

it("alert is reachable through the registry", () => {
  expect(listWidgets()).toContain("alert");
  expect(create("alert", { message: "Hi" })).toBe('<div class="alert alert--info">Hi</div>');
});
