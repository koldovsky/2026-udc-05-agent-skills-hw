import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createSpinner(props: SpinnerProps): string {
  const size = props.size ?? "md";
  if (size !== "sm" && size !== "md" && size !== "lg") {
    throw new Error(`Invalid spinner size "${String(size)}"`);
  }

  const label = props.label ?? "Loading";
  if (typeof label !== "string") {
    throw new Error("Spinner label must be a string");
  }

  return `<span class="spinner spinner--${size}" role="status" aria-label="${escapeHtml(label)}"></span>`;
}

register("spinner", createSpinner);
