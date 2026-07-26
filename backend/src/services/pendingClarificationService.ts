import { CandidateRecord } from "../utils/intelligenceContract";

export interface PendingClarification {
  patientId: string;
  hospitalId?: string;
  originalWhatsappMessageId: string;
  originalSourceText: string;
  language: string;
  candidateRecords: CandidateRecord[];
  missingFields: string[];
  unresolvedMeasurements?: number[];
  clarificationReason: string;
  createdAt: Date;
  expiresAt: Date;
  originalMessageDate: Date; // Preserves the original message arrival date for timeline accuracy
  status: "pending" | "completed" | "expired" | "cancelled";

  // Sprint 40 Correction Fields
  isCorrection?: boolean;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  parameter?: string | null;
  candidateTargets?: any[]; // Stores ambiguous match targets
  proposedNewContext?: string | null;
  proposedNewTimeContext?: string | null;
}

// In-memory store of pending clarifications mapped by patientId (strict patient scoping)
const pendingClarificationStore = new Map<string, PendingClarification>();

export interface RecentlyResolvedRecord {
  patientId: string;
  parameter: string;
  value: any;
  unit: string;
  context?: string;
  timeContext?: string;
  recordedAt: Date;
  whatsappMessageId: string;
}

export interface RecentlyResolvedContext {
  patientId: string;
  records: RecentlyResolvedRecord[];
  createdAt: Date;
  expiresAt: Date;
}

// In-memory store of recently resolved context, mapped by patientId, with 5 minute TTL.
const recentlyResolvedStore = new Map<string, RecentlyResolvedContext>();

export function getRecentlyResolvedContext(patientId: string): RecentlyResolvedContext | null {
  if (!patientId) return null;
  const entry = recentlyResolvedStore.get(patientId);
  if (!entry) return null;
  if (entry.expiresAt.getTime() < Date.now()) {
    recentlyResolvedStore.delete(patientId);
    return null;
  }
  return entry;
}

export function setRecentlyResolvedContext(patientId: string, records: RecentlyResolvedRecord[]): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute TTL
  recentlyResolvedStore.set(patientId, {
    patientId,
    records,
    createdAt: now,
    expiresAt
  });
}

export function clearRecentlyResolvedContext(patientId: string): void {
  recentlyResolvedStore.delete(patientId);
}

/**
 * Deterministically checks if a message contains a query intent for read-back/read-only.
 * Returns the matched parameter string or "today" or null if not a query.
 */
export function detectQueryPattern(msg: string): { type: "latest" | "today" | null; parameter?: string } {
  const clean = msg.toLowerCase().trim();

  // To prevent false positives where a new health reading contains relative temporal words like "today" or "aaj",
  // we require actual query keywords or question markers to classify it as a read-back query.
  const queryKeywords = [
    "kitni", "kitna", "kya", "bheji", "bheja", "what", "did", "how", "?", "show", "tell", "read-back", "read back",
    "batao", "bataiye", "bata", "dikhao", "dikha", "readings", "reading"
  ];
  const hasQueryKeyword = queryKeywords.some(kw => {
    if (kw === "?") return clean.includes("?");
    return new RegExp(`\\b${kw}\\b`, "i").test(clean);
  });

  if (!hasQueryKeyword) {
    return { type: null };
  }

  const isToday =
    clean.includes("aaj") ||
    clean.includes("today") ||
    clean.includes("readings sent today");

  if (isToday) {
    return { type: "today" };
  }

  const isLatest =
    clean.includes("last") ||
    clean.includes("latest") ||
    clean.includes("bheji") ||
    clean.includes("bheja") ||
    clean.includes("kitni thi") ||
    clean.includes("kya tha") ||
    clean.includes("kya hai") ||
    clean.includes("latest oxygen") ||
    clean.includes("last sugar") ||
    clean.includes("last bp");

  if (isLatest) {
    // Detect parameter
    const keywordsMap: Record<string, string[]> = {
      blood_sugar: ["sugar", "glucose", "shugar", "चीनी", "शुगर"],
      blood_pressure: ["bp", "blood pressure", "pressure", "बीपी", "रक्तचाप"],
      heart_rate: ["pulse", "heart rate", "hr", "bpm", "dhadkan", "पल्स", "धड़कन"],
      oxygen_saturation: ["oxygen", "spo2", "o2", "saturation", "ऑक्सीजन", "ओक्सीजन", "ऑक्सिजन"],
      body_temperature: ["temp", "temperature", "fever", "bukhar", "तापमान"],
      weight: ["weight", "vajan", "wajan", "kg", "वजन"],
      respiratory_rate: ["breath", "breathing", "resp", "respiratory", "saans"],
      height: ["height", "lambai", "kad"],
      hba1c: ["hba1c", "hb a1c", "a1c"],
      hemoglobin: ["hemoglobin", "hb", "hemo", "heamoglobin"],
      creatinine: ["creatinine", "creatinin"],
      fasting_blood_sugar: ["fbs", "fasting blood sugar", "fasting sugar"],
      post_prandial_blood_sugar: ["ppbs", "post-prandial", "post prandial"],
      random_blood_sugar: ["rbs", "random blood sugar", "random sugar"],
      urea: ["urea"],
      tsh: ["tsh"],
      t3: ["t3"],
      t4: ["t4"],
      vitamin_d: ["vitamin d", "vit d"],
      vitamin_b12: ["vitamin b12", "vit b12"],
      rbc: ["rbc"],
      wbc: ["wbc"],
      platelets: ["platelets"],
      cholesterol: ["cholesterol"],
      hdl: ["hdl"],
      ldl: ["ldl"],
      triglycerides: ["triglycerides"]
    };

    for (const [param, keywords] of Object.entries(keywordsMap)) {
      for (const kw of keywords) {
        if (clean.includes(kw)) {
          return { type: "latest", parameter: param };
        }
      }
    }

    // Default latest read-back
    return { type: "latest" };
  }

  return { type: null };
}

/**
 * Helper to get TTL in minutes from environment, defaulting to 15 minutes.
 */
export function getTTLMinutes(): number {
  const envVal = process.env.WHATSAPP_CLARIFICATION_TTL_MINUTES;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 15; // default 15 minutes
}

/**
 * Retrieves the active pending clarification for a given patient.
 * Automatically checks and handles expiration.
 */
export function getPendingClarification(patientId: string): PendingClarification | null {
  if (!patientId) return null;

  const entry = pendingClarificationStore.get(patientId);
  if (!entry) return null;

  // Check for expiration
  if (entry.status === "pending" && entry.expiresAt.getTime() < Date.now()) {
    entry.status = "expired";
  }

  if (entry.status !== "pending") {
    return null;
  }

  return entry;
}

/**
 * Creates or updates the pending clarification state for a given patient.
 */
export function setPendingClarification(
  patientId: string,
  data: Omit<PendingClarification, "createdAt" | "expiresAt" | "status">
): PendingClarification {
  const now = new Date();
  const ttlMinutes = getTTLMinutes();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const clarification: PendingClarification = {
    ...data,
    createdAt: now,
    expiresAt,
    status: "pending",
  };

  pendingClarificationStore.set(patientId, clarification);
  return clarification;
}

/**
 * Explicitly clears the pending clarification for a patient.
 */
export function clearPendingClarification(patientId: string): void {
  pendingClarificationStore.delete(patientId);
}

/**
 * Marks a pending clarification as completed.
 */
export function completePendingClarification(patientId: string): void {
  const entry = pendingClarificationStore.get(patientId);
  if (entry) {
    entry.status = "completed";
  }
}

/**
 * Marks a pending clarification as cancelled.
 */
export function cancelPendingClarification(patientId: string): void {
  const entry = pendingClarificationStore.get(patientId);
  if (entry) {
    entry.status = "cancelled";
  }
}

/**
 * Clears the entire store (mainly for test cleanup).
 */
export function clearAllPendingClarifications(): void {
  pendingClarificationStore.clear();
}

/**
 * Helper to get raw store (useful for debugging/testing).
 */
export function getPendingStore(): Map<string, PendingClarification> {
  return pendingClarificationStore;
}
