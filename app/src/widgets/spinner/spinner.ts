import { register, type WidgetProps } from "../../core/registry.js";

export interface CreateSpinnerProps extends WidgetProps {
  size?: "small" | "medium" | "large";
  label?: string;
}

export function createSpinner(props: CreateSpinnerProps): string {
  const size = props.size ?? "medium";
  const label = props.label ?? "Loading…";
  return `<span class="spinner spinner--${size}" role="status" aria-label="${label}"></span>`;
}

register("spinner", createSpinner);
