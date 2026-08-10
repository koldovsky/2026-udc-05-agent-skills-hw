import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const HTML_ESCAPES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

// `label` is caller-supplied text landing inside a quoted HTML attribute: a `"`
// in it would close the attribute early. `size` is a closed union, so it needs
// no escaping.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES.get(char) ?? char);
}

export function createSpinner(props: SpinnerProps = {}): string {
  const size = props.size ?? "md";
  const label = escapeHtml(props.label ?? "Loading");
  return `<span class="spinner spinner--${size}" role="status" aria-label="${label}"></span>`;
}

register("spinner", createSpinner);
