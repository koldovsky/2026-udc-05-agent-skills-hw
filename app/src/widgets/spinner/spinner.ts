import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
}

export function createSpinner(props: SpinnerProps): string {
  const size = props.size ?? "md";
  return `<span class="spinner spinner--${size}"></span>`;
}

register("spinner", createSpinner);
