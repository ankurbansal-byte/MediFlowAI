export interface ParameterDefinition {
  canonicalKey: string;
  displayName: string;
  defaultUnit: string;
  supportedUnits: string[];
}

export const PARAMETER_REGISTRY: Record<string, ParameterDefinition> = {
  blood_sugar: {
    canonicalKey: "blood_sugar",
    displayName: "Blood Glucose",
    defaultUnit: "mg/dL",
    supportedUnits: ["mg/dL", "mmol/L"],
  },
  blood_pressure: {
    canonicalKey: "blood_pressure",
    displayName: "Blood Pressure",
    defaultUnit: "mmHg",
    supportedUnits: ["mmHg"],
  },
  heart_rate: {
    canonicalKey: "heart_rate",
    displayName: "Heart Rate / Pulse",
    defaultUnit: "bpm",
    supportedUnits: ["bpm"],
  },
  oxygen_saturation: {
    canonicalKey: "oxygen_saturation",
    displayName: "Oxygen Saturation / SpO2",
    defaultUnit: "%",
    supportedUnits: ["%"],
  },
  body_temperature: {
    canonicalKey: "body_temperature",
    displayName: "Body Temperature",
    defaultUnit: "°C",
    supportedUnits: ["°C", "°F", "F", "C"],
  },
  weight: {
    canonicalKey: "weight",
    displayName: "Body Weight",
    defaultUnit: "kg",
    supportedUnits: ["kg", "lbs"],
  },
  respiratory_rate: {
    canonicalKey: "respiratory_rate",
    displayName: "Respiratory Rate",
    defaultUnit: "breaths/min",
    supportedUnits: ["breaths/min"],
  },
  height: {
    canonicalKey: "height",
    displayName: "Height",
    defaultUnit: "cm",
    supportedUnits: ["cm", "inches", "m"],
  },
};
