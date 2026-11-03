import { describe, expect, expectTypeOf, it } from "vitest";
import { createHudMeter, mountLagHud, type HudMeter, type LagHudDisplay } from "@mark1russell7/lag-hud";

describe("mountLagHud with the DOM types", () => {
  // These calls are never made: the type check examines them. A DOM element and a DOM document need no wrapper.
  const dom = (hud: HudMeter, parent: HTMLElement, doc: Document): void => {
    expectTypeOf(mountLagHud(hud, { parent })).toEqualTypeOf<LagHudDisplay<HTMLElement>>();
    expectTypeOf(mountLagHud(hud, { document: doc, parent })).toEqualTypeOf<LagHudDisplay<HTMLElement>>();
    expectTypeOf(mountLagHud(hud).element).toEqualTypeOf<HTMLElement>();
  };

  it("accepts an HTMLElement and a Document", () => {
    expect(dom).toBeTypeOf("function");
    expect(createHudMeter).toBeTypeOf("function");
  });
});
