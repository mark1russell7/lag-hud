// The parts of the page that all sections use: the element helper, the theme button and the segmented controls.

type Child = Node | string | null | undefined | false;

/** This function makes an element with attributes and children. An attribute with the value `false` or `null` is not set. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Readonly<Record<string, string | number | boolean | null | undefined>> = {},
  ...children: readonly (Child | readonly Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === "class") el.className = String(value);
    else el.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

/** The element with the ID. The page has each ID that the code asks for, so a missing ID is an error of the page. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`The page has no element "${id}".`);
  return el as T;
}

const THEMES = ["auto", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];
const THEME_KEY = "lag-hud-theme";

/** The theme button: auto (the setting of the system), light and dark, in turn. The choice stays in this browser. */
export function setupTheme(button: HTMLButtonElement): void {
  const read = (): Theme => {
    const t = document.documentElement.dataset["theme"];
    return t === "light" || t === "dark" ? t : "auto";
  };
  const show = (theme: Theme): void => {
    button.textContent = `Theme: ${theme}`;
    button.setAttribute("aria-label", `Color theme: ${theme}. Select to change.`);
  };
  show(read());
  button.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(read()) + 1) % THEMES.length]!;
    if (next === "auto") delete document.documentElement.dataset["theme"];
    else document.documentElement.dataset["theme"] = next;
    try {
      if (next === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // A browser with no storage keeps the theme until the page closes.
    }
    show(next);
  });
}

/** One choice of a segmented control. */
export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
  /** The text of the tooltip and of the accessible name, when the label is short. */
  readonly title?: string;
}

/** A segmented control: a group of radio buttons. The arrow keys move the choice, as in a radio group. */
export class Segmented<T extends string> {
  private readonly buttons: HTMLButtonElement[];

  constructor(
    container: HTMLElement,
    private readonly choices: readonly Choice<T>[],
    private current: T,
    private readonly onChange: (value: T) => void,
  ) {
    this.buttons = choices.map((choice) => {
      const button = h(
        "button",
        { type: "button", role: "radio", "data-value": choice.value, title: choice.title, "aria-label": choice.title },
        choice.label,
      );
      button.addEventListener("click", () => this.choose(choice.value, false));
      return button;
    });
    container.replaceChildren(...this.buttons);
    container.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      const index = this.choices.findIndex((c) => c.value === this.current);
      const next = this.choices[(index + step + this.choices.length) % this.choices.length]!;
      this.choose(next.value, true);
    });
    this.show();
  }

  /** The value of the control. */
  get value(): T {
    return this.current;
  }

  private choose(value: T, focus: boolean): void {
    const changed = value !== this.current;
    this.current = value;
    this.show();
    if (focus) this.buttons.find((b) => b.dataset["value"] === value)?.focus();
    if (changed) this.onChange(value);
  }

  private show(): void {
    for (const button of this.buttons) {
      const on = button.dataset["value"] === this.current;
      button.setAttribute("aria-checked", String(on));
      button.tabIndex = on ? 0 : -1;
    }
  }
}
