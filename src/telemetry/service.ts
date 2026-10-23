import { TelemetryEngine } from './TelemetryEngine'

/** App-wide telemetry engine (one active source at a time). */
export const telemetry = new TelemetryEngine()
