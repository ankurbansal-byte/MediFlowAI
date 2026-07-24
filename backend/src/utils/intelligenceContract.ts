export type MessageLanguage = "hindi" | "hinglish" | "english" | "unknown";
export type MessageAction = "RECORD" | "CLARIFY" | "IGNORE";
export type MessageIntent =
  | "health_measurement"
  | "conversational"
  | "ambiguous_health_message"
  | "unsupported"
  | "unknown";

export type GlucoseContext =
  | "fasting"
  | "pre_meal"
  | "post_meal"
  | "random"
  | "unknown";

export interface CandidateRecord {
  parameter: string;
  value?: number | string;
  systolic?: number;
  diastolic?: number;
  unit: string;
  context?: GlucoseContext;
  recordedAt?: string | Date | null;
  confidence: number;
  sourceText?: string;
}

export interface IntelligenceResult {
  language: MessageLanguage;
  action: MessageAction;
  intent: MessageIntent;
  candidateRecords: CandidateRecord[];
  missingFields: string[];
  reason?: string;
  unresolvedMeasurements?: number[];
}
