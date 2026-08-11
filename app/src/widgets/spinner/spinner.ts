import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "small" | "medium" | "large";
}

export function createSpinner(props: SpinnerProps): string {
  const size = props.size ?? "medium";
  return `<span class="spinner spinner--${size}"></span>`;
}

register("spinner", createSpinner);
