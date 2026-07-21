export interface EncounterMock {
  encounterId: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  visitDate: Date;
  visitType: string;
  chiefComplaint: string;
  symptoms: string;
  provisionalDiagnosis: string;
  doctorNotes: string;
  followUpDate?: Date;
  status: "draft" | "completed";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Seed reasonable initial mock encounters for the mock system
const now = new Date();
const pastDate1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
const pastDate2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

export let dynamicMockEncounters: EncounterMock[] = [
  {
    encounterId: "ENC-10001",
    hospitalId: "HOSP-001",
    patientId: "PAT-101",
    doctorId: "DOC-101",
    visitDate: pastDate1,
    visitType: "OPD Consultation",
    chiefComplaint: "Routine diabetes checkup and slight fatigue",
    symptoms: "Minor thirst, feeling tired in the mornings",
    provisionalDiagnosis: "Type 2 Diabetes Mellitus - Under Control",
    doctorNotes: "Patient's fasting blood sugar is improving. Keep up the diet and exercise.",
    followUpDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days later
    status: "completed",
    createdBy: "admin",
    createdAt: pastDate1,
    updatedAt: pastDate1,
  },
  {
    encounterId: "ENC-10002",
    hospitalId: "HOSP-001",
    patientId: "PAT-102",
    doctorId: "DOC-101",
    visitDate: pastDate2,
    visitType: "Specialist OPD",
    chiefComplaint: "Fluctuation in blood sugar, occasional dry mouth",
    symptoms: "Excessive thirst, increased urination at night",
    provisionalDiagnosis: "Uncontrolled Hyperglycemia",
    doctorNotes: "Observed rising blood sugar patterns. Advised regular glucose logging.",
    status: "draft",
    createdBy: "admin",
    createdAt: pastDate2,
    updatedAt: pastDate2,
  },
];
