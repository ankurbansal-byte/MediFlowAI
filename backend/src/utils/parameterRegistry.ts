export interface ParameterDefinition {
  canonicalKey: string;
  displayName: string;
  defaultUnit: string;
  supportedUnits: string[];
  isCompound?: boolean;
  components?: string[];
  plausibleRanges?: Record<string, { min: number; max: number }>;
}

export const PARAMETER_REGISTRY: Record<string, ParameterDefinition> = {
  blood_sugar: {
    canonicalKey: "blood_sugar",
    displayName: "Blood Glucose",
    defaultUnit: "mg/dL",
    supportedUnits: ["mg/dL", "mmol/L"],
    plausibleRanges: {
      "mg/dL": { min: 30, max: 500 },
      "mmol/L": { min: 1.6, max: 27.8 },
      "default": { min: 30, max: 500 }
    }
  },
  blood_pressure: {
    canonicalKey: "blood_pressure",
    displayName: "Blood Pressure",
    defaultUnit: "mmHg",
    supportedUnits: ["mmHg"],
    isCompound: true,
    components: ["systolic", "diastolic"],
    plausibleRanges: {
      "systolic": { min: 70, max: 250 },
      "diastolic": { min: 40, max: 150 }
    }
  },
  heart_rate: {
    canonicalKey: "heart_rate",
    displayName: "Heart Rate / Pulse",
    defaultUnit: "bpm",
    supportedUnits: ["bpm"],
    plausibleRanges: {
      "bpm": { min: 30, max: 250 },
      "default": { min: 30, max: 250 }
    }
  },
  oxygen_saturation: {
    canonicalKey: "oxygen_saturation",
    displayName: "Oxygen Saturation / SpO2",
    defaultUnit: "%",
    supportedUnits: ["%"],
    plausibleRanges: {
      "%": { min: 50, max: 100 },
      "default": { min: 50, max: 100 }
    }
  },
  body_temperature: {
    canonicalKey: "body_temperature",
    displayName: "Body Temperature",
    defaultUnit: "°C",
    supportedUnits: ["°C", "°F", "F", "C"],
    plausibleRanges: {
      "°C": { min: 30, max: 45 },
      "C": { min: 30, max: 45 },
      "°F": { min: 85, max: 115 },
      "F": { min: 85, max: 115 },
      "default": { min: 30, max: 45 }
    }
  },
  weight: {
    canonicalKey: "weight",
    displayName: "Body Weight",
    defaultUnit: "kg",
    supportedUnits: ["kg", "lbs"],
    plausibleRanges: {
      "kg": { min: 10, max: 300 },
      "lbs": { min: 22, max: 660 },
      "default": { min: 10, max: 300 }
    }
  },
  respiratory_rate: {
    canonicalKey: "respiratory_rate",
    displayName: "Respiratory Rate",
    defaultUnit: "breaths/min",
    supportedUnits: ["breaths/min"],
    plausibleRanges: {
      "breaths/min": { min: 10, max: 40 },
      "default": { min: 10, max: 40 }
    }
  },
  height: {
    canonicalKey: "height",
    displayName: "Height",
    defaultUnit: "cm",
    supportedUnits: ["cm", "inches", "m"],
    plausibleRanges: {
      "cm": { min: 50, max: 250 },
      "default": { min: 50, max: 250 }
    }
  },
};
