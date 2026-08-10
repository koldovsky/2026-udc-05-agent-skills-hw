import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function createAlert(props: AlertProps): string {
  if (props === null || typeof props !== "object") {
    throw new Error("alert: props must be an object");
  }
  if (typeof props.message !== "string") {
    throw new Error(`alert: message must be a string, got ${typeof props.message}`);
  }
  const allowedTones = ["info", "warn", "error"];
  const tone = allowedTones.includes(props.tone || "") ? props.tone : "info";
  const escapedMessage = escapeHtml(props.message);
  return `<div class="alert alert--${tone}">${escapedMessage}</div>`;
}

register("alert", createAlert);