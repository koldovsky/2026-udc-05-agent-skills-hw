import { escapeHtml } from "../../core/escape-html.js";
import { register, type WidgetProps } from "../../core/registry.js";

export interface BadgeProps extends WidgetProps {
  label: string;
  tone?: "info" | "warn" | "error";
}

// The pattern every widget follows — this is exactly what a "creating-widget"
// skill should encode: a pure function returning an HTML string, registered
// under the widget's own name, with a colocated *.test.ts.
export function createBadge(props: BadgeProps): string {
  // Narrowed at runtime, not just in types — `create()` erases props to
  // `Record<string, unknown>`, so an unchecked tone could close the attribute.
  const tone = props.tone === "warn" || props.tone === "error" ? props.tone : "info";
  return `<span class="badge badge--${tone}">${escapeHtml(props.label)}</span>`;
}

register("badge", createBadge);
