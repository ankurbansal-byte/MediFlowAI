import User from "../models/User";
import { dynamicMockUsers } from "./mockUsers";

/**
 * Safely normalizes and compares two phone numbers to see if they are equivalent.
 * It strips all non-numeric characters first.
 * If both of the numbers are at least 10 digits, they are considered equivalent if their last 10 digits match.
 * This handles cases like:
 * - "+917618432290" vs "917618432290" vs "07618432290" vs "7618432290"
 */
export function arePhoneNumbersEquivalent(p1: string, p2: string): boolean {
  if (!p1 || !p2) return false;
  const clean1 = p1.replace(/\D/g, "");
  const clean2 = p2.replace(/\D/g, "");

  if (clean1 === clean2) return true;

  if (clean1.length >= 10 && clean2.length >= 10) {
    return clean1.slice(-10) === clean2.slice(-10);
  }

  return false;
}

/**
 * Resolves an incoming WhatsApp sender phone number against an enrolled User
 * with the role of "patient".
 * Returns the matching User object (or mock user), or null if not found, ambiguous, or invalid.
 */
export async function findEnrolledPatientByWhatsApp(from: string) {
  if (!from) return null;
  const cleanFrom = from.replace(/\D/g, "");
  if (!cleanFrom) return null;

  const last10 = cleanFrom.length >= 10 ? cleanFrom.slice(-10) : cleanFrom;

  let potentialPatients: any[] = [];

  if (process.env.USE_MOCK_DATA === "true") {
    potentialPatients = dynamicMockUsers.filter((user) => {
      if (user.role !== "patient" || !user.mobileNumber) return false;
      const cleanMobile = user.mobileNumber.replace(/\D/g, "");
      return cleanMobile.endsWith(last10);
    });
  } else {
    potentialPatients = await User.find({
      role: "patient",
      mobileNumber: { $regex: new RegExp(last10 + "$") },
    });
  }

  // Filter precisely in-memory using equivalence check
  const matchedPatients = potentialPatients.filter((patient) => {
    return patient.mobileNumber && arePhoneNumbersEquivalent(from, patient.mobileNumber);
  });

  if (matchedPatients.length === 1) {
    return matchedPatients[0];
  }

  if (matchedPatients.length > 1) {
    console.log(`[WhatsApp Identity Resolution Ambiguous] Multiple potential patient users matched for WhatsApp sender ${from}.`);
    return null; // Ambiguous or unsafe, do not guess
  }

  console.log(`[WhatsApp Identity Resolution Failed] WhatsApp sender ${from} is not linked to any enrolled patient user.`);
  return null;
}
