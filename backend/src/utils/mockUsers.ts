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
    // bcrypt hash of "password" with 10 salt rounds: $2a$10$9v3YV0yO.A/8vA8C.E1z.OKX/HmsH04qO7V7tU7p0D2uorx3gSgKG (we will just use bcrypt.compare/hash or a hardcoded bcrypt string)
    // Actually, we can hash the passwords on start/load, or use bcrypt.hashSync. Let's pre-generate or hash dynamically.
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
];
