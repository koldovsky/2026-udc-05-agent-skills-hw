import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function createSpinner(props: SpinnerProps): string {
  const size = props.size ?? "md";
  const label = props.label ?? "Loading";
  return `<span class="spinner spinner--${size}" role="status" aria-label="${label}"></span>`;
}

register("spinner", createSpinner);
