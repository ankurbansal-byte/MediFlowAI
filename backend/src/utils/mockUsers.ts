import bcrypt from "bcryptjs";

export const MOCK_USERS = [
  {
    username: "admin",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "admin" as const,
    patientId: undefined,
  },
  {
    username: "doctor1",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "doctor" as const,
    patientId: undefined,
  },
  {
    username: "PAT-101",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-101",
  },
  {
    username: "PAT-102",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-102",
  },
  {
    username: "PAT-103",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-103",
  },
  {
    username: "PAT-104",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-104",
  },
  {
    username: "PAT-105",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-105",
  },
  {
    username: "PAT-106",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-106",
  },
  {
    username: "PAT-36B",
    passwordHash: bcrypt.hashSync("password", 10),
    role: "patient" as const,
    patientId: "PAT-36B",
  },
];

export let dynamicMockUsers: any[] = [...MOCK_USERS].map((user) => ({
  username: user.username,
  passwordHash: user.passwordHash,
  role: user.role,
  patientId: user.patientId,
  doctorId: user.role === "doctor" ? "DOC-101" : undefined,
  hospitalId: "HOSP-001",
  fullName: user.role === "doctor" ? "Dr. Demo" : user.role === "admin" ? "Hospital Admin" : `Patient ${user.username}`,
  email: `${user.username.toLowerCase()}@mediflow.com`,
  mobileNumber: "+1234567890",
  isEmailVerified: true, // Seeded users are pre-verified
  status: "active",
  refreshTokens: [] as string[],
  emailVerificationToken: undefined as string | undefined,
  emailVerificationTokenExpires: undefined as Date | undefined,
  passwordResetToken: undefined as string | undefined,
  passwordResetTokenExpires: undefined as Date | undefined,
  dob: user.role === "patient" ? "1990-01-01" : "1980-01-01",
  gender: user.role === "patient" ? "Male" : "Male",
  medicalRegistrationNumber: user.role === "doctor" ? "MED-12345" : undefined,
  hospitalClinicName: user.role === "doctor" ? "MediFlow Hospital" : undefined,
  specialization: user.role === "doctor" ? "General Medicine" : undefined,
  department: user.role === "doctor" ? "General Medicine" : undefined,
  qualification: user.role === "doctor" ? "MD, MBBS" : undefined,
  yearsOfExperience: user.role === "doctor" ? "10" : undefined,
  mustChangePassword: false,
}));

// Mock assignments array for process.env.USE_MOCK_DATA === "true"
export let dynamicMockAssignments: any[] = [
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-101",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-102",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-103",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-104",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-105",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-106",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  },
  {
    hospitalId: "HOSP-001",
    doctorId: "DOC-101",
    patientId: "PAT-36B",
    status: "active",
    assignedAt: new Date(),
    assignedBy: "admin"
  }
];
