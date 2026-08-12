import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "normal" | "fast";
}

const VALID_SIZES = new Set(["sm", "md", "lg"]);
const VALID_SPEEDS = new Set(["slow", "normal", "fast"]);

export function createSpinner(props: SpinnerProps = {}): string {
  const size = props.size ?? "md";
  const speed = props.speed ?? "normal";

  if (!VALID_SIZES.has(size)) {
    throw new Error(`Invalid size "${size}". Must be one of: sm, md, lg`);
  }
  if (!VALID_SPEEDS.has(speed)) {
    throw new Error(`Invalid speed "${speed}". Must be one of: slow, normal, fast`);
  }

  return `<div class="spinner spinner--${size} spinner--${speed}"></div>`;
}

register("spinner", createSpinner);
