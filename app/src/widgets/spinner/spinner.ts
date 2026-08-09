import { register, type WidgetProps } from "../../core/registry.js";
import { escapeHtml } from "../html.js";

const spinnerSizes = ["sm", "md", "lg"] as const;

export interface SpinnerProps extends WidgetProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function createSpinner(props: SpinnerProps = {}): string {
  const label = props.label ?? "Loading";
  if (typeof label !== "string") {
    throw new Error("Spinner label must be a string");
  }

  const size = props.size ?? "md";
  if (!spinnerSizes.includes(size)) {
    throw new Error("Spinner size must be one of: sm, md, lg");
  }

  return `<span class="spinner spinner--${size}" role="status" aria-label="${escapeHtml(label)}"></span>`;
}

register("spinner", createSpinner);
