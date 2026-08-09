import { register, type WidgetProps } from "../../core/registry.js";
import { escapeHtml } from "../html.js";

const alertTones = ["info", "warn", "error"] as const;

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

export function createAlert(props: AlertProps): string {
  const message = props?.message;
  if (typeof message !== "string") {
    throw new Error("Alert message is required and must be a string");
  }

  const tone = props.tone ?? "info";
  if (!alertTones.includes(tone)) {
    throw new Error("Alert tone must be one of: info, warn, error");
  }

  return `<div class="alert alert--${tone}">${escapeHtml(message)}</div>`;
}

register("alert", createAlert);
