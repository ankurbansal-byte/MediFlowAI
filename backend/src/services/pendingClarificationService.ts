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
}

// In-memory store of pending clarifications mapped by patientId (strict patient scoping)
const pendingClarificationStore = new Map<string, PendingClarification>();

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
