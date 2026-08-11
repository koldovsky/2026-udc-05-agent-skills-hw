import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "normal" | "fast";
}

export function createSpinner(props: SpinnerProps = {}): string {
  const size = props.size ?? "md";
  const speed = props.speed ?? "normal";
  return `<div class="spinner spinner--${size} spinner--${speed}"></div>`;
}

register("spinner", createSpinner);
