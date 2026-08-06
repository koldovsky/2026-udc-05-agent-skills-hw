import { register, type WidgetProps } from "../../core/registry.js";
import { escapeHtml } from "../../core/escapeHtml.js";

export interface SpinnerProps extends WidgetProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const ALLOWED_SIZES = new Set(["sm", "md", "lg"]);

export function createSpinner(props: SpinnerProps = {}): string {
  const size = props.size ?? "md";
  if (!ALLOWED_SIZES.has(size)) {
    throw new TypeError('Spinner "size" must be one of "sm" | "md" | "lg"');
  }
  const label = props.label ?? "Loading";
  if (typeof label !== "string") {
    throw new TypeError('Spinner "label" must be a string');
  }
  return `<span class="spinner spinner--${size}" role="status" aria-label="${escapeHtml(label)}"></span>`;
}

register("spinner", createSpinner);
