
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void {
  if (widgets.has(name)) {
    throw new Error(`Widget "${name}" is already registered`);
  }
  widgets.set(name, factory as WidgetFactory);
}

export function create(name: string, props: WidgetProps = {}): string {
  const factory = widgets.get(name);
  if (!factory) {
    throw new Error(`Unknown widget "${name}". Registered: ${[...widgets.keys()].join(", ")}`);
  }
  return factory(props);
}

export function listWidgets(): string[] {
  return [...widgets.keys()];
}
