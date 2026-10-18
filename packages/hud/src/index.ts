/**
 * `@mark1russell7/lag-hud`: an in-memory meter for `@mark1russell7/lag`, a fan-out to more meters (for example
 * OpenTelemetry), and a small display that needs no framework.
 */
export {
  createHudMeter,
  fanOutMeter,
  formatLagStat,
  quantile,
  type Attributes,
  type AttributeValue,
  type Counter,
  type Histogram,
  type HudMeter,
  type HudMeterOptions,
  type InstrumentOptions,
  type LagStat,
  type Meter,
} from "./meter.ts";
export { lagHudText, mountLagHud, type DisplayDocument, type DisplayElement, type LagHudDisplay, type LagHudDisplayOptions } from "./display.ts";
