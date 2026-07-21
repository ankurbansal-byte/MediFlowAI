import { Response } from "express";
import HealthRecord from "../models/HealthRecord";
import Assignment from "../models/Assignment";
import { generateDemoRecords } from "../utils/demoData";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import User from "../models/User";
import Hospital from "../models/Hospital";
import { dynamicMockUsers, dynamicMockAssignments } from "../utils/mockUsers";
import { dynamicMockHospitals } from "../utils/mockHospitals";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type PatientDiscoveryResult = {
  patientId: string;
  latestRecordedAt: Date;
  totalRecords: number;
};

// ==============================
// Fallback Mock Data Definition
// ==============================
const demoRecords = generateDemoRecords();

// Group by patientId
const MOCK_RECORDS: Record<string, any[]> = {};
for (const r of demoRecords) {
  if (!MOCK_RECORDS[r.patientId]) {
    MOCK_RECORDS[r.patientId] = [];
  }
  MOCK_RECORDS[r.patientId].push({
    parameter: r.parameter,
    value: r.value,
    unit: r.unit,
    recordedAt: r.recordedAt,
    source: r.source,
    confidence: r.confidence,
    originalMessage: r.originalMessage,
    whatsappMessageId: r.whatsappMessageId
  });
}

// Generate patient discovery summary list sorted by latestRecordedAt descending
const MOCK_PATIENTS = Object.keys(MOCK_RECORDS).map((patientId) => {
  const records = MOCK_RECORDS[patientId];
  const latestRecord = records[records.length - 1];
  return {
    patientId,
    latestRecordedAt: latestRecord.recordedAt,
    totalRecords: records.length,
  };
}).sort((a, b) => b.latestRecordedAt.getTime() - a.latestRecordedAt.getTime());

// ==============================
// List Patients
// ==============================
export const getPatients = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  // If Patient, restrict to only their own PatientOption
  if (user.role === "patient") {
    const patientId = user.patientId;
    if (!patientId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    if (process.env.USE_MOCK_DATA === "true") {
      const records = MOCK_RECORDS[patientId] || [];
      const latestRecord = records[records.length - 1];
      const singlePatient = latestRecord ? [{
        patientId,
        latestRecordedAt: latestRecord.recordedAt,
        totalRecords: records.length,
      }] : [];

      return res.status(200).json({
        success: true,
        totalPatients: singlePatient.length,
        patients: singlePatient,
      });
    }

    try {
      const patients = await HealthRecord.aggregate<PatientDiscoveryResult>([
        { $match: { patientId } },
        {
          $group: {
            _id: "$patientId",
            latestRecordedAt: { $max: "$recordedAt" },
            totalRecords: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            patientId: "$_id",
            latestRecordedAt: 1,
            totalRecords: 1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        totalPatients: patients.length,
        patients,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch patients.",
      });
    }
  }

  // For Doctor (restricted to actively assigned patients in their same hospital)
  if (user.role === "doctor") {
    let doctorId = "";
    let hospitalId = "";
    if (process.env.USE_MOCK_DATA === "true") {
      const doctorUser = dynamicMockUsers.find((u) => u.username === user.username);
      if (doctorUser) {
        doctorId = doctorUser.doctorId;
        hospitalId = doctorUser.hospitalId;
      }
    } else {
      try {
        const doctorUser = await User.findOne({ username: user.username });
        if (doctorUser) {
          doctorId = doctorUser.doctorId || "";
          hospitalId = doctorUser.hospitalId || "";
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!doctorId || !hospitalId) {
      return res.status(200).json({ success: true, totalPatients: 0, patients: [] });
    }

    // Get assigned patients
    let assignedPatientIds: string[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      assignedPatientIds = dynamicMockAssignments
        .filter((a) => a.doctorId === doctorId && a.status === "active" && a.hospitalId === hospitalId)
        .map((a) => a.patientId);
    } else {
      try {
        assignedPatientIds = await Assignment.find({
          doctorId,
          status: "active",
          hospitalId,
        }).distinct("patientId");
      } catch (err) {
        console.error(err);
      }
    }

    if (process.env.USE_MOCK_DATA === "true") {
      const dynamicMockPatients = Object.keys(MOCK_RECORDS)
        .filter((pId) => assignedPatientIds.includes(pId))
        .map((pId) => {
          const recs = MOCK_RECORDS[pId] || [];
          const latestRec = recs[recs.length - 1];
          return {
            patientId: pId,
            latestRecordedAt: latestRec ? latestRec.recordedAt : new Date(),
            totalRecords: recs.length,
          };
        })
        .sort((a, b) => new Date(b.latestRecordedAt).getTime() - new Date(a.latestRecordedAt).getTime());

      return res.status(200).json({
        success: true,
        totalPatients: dynamicMockPatients.length,
        patients: dynamicMockPatients,
      });
    }

    try {
      const patients = await HealthRecord.aggregate<PatientDiscoveryResult>([
        { $match: { patientId: { $in: assignedPatientIds } } },
        {
          $group: {
            _id: "$patientId",
            latestRecordedAt: { $max: "$recordedAt" },
            totalRecords: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            patientId: "$_id",
            latestRecordedAt: 1,
            totalRecords: 1,
          },
        },
        { $sort: { latestRecordedAt: -1 } },
      ]);

      return res.status(200).json({
        success: true,
        totalPatients: patients.length,
        patients,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch patients.",
      });
    }
  }

  // Fallback (for admin/other if any, return empty as Admin has administrative PatientsView instead)
  return res.status(200).json({
    success: true,
    totalPatients: 0,
    patients: [],
  });
};

/**
 * GET /api/patient/admin/detail/:patientId
 * Returns the full details of a patient, including the hospital name.
 */
export const getPatientDetailByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const patientId = req.params.patientId as string;
  const isAllowed = await canAccessPatient(req.user, patientId);
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: "Forbidden. Patient does not belong to your hospital." });
  }

  // Get patient details
  let patient: any = null;
  if (process.env.USE_MOCK_DATA === "true") {
    const found = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    if (found) {
      patient = {
        patientId: found.patientId,
        username: found.username,
        fullName: found.fullName,
        email: found.email,
        mobileNumber: found.mobileNumber,
        dob: found.dob,
        gender: found.gender,
        hospitalId: found.hospitalId,
        status: found.status || "active",
        createdAt: (found as any).createdAt || new Date().toISOString(),
      };
    }
  } else {
    try {
      const found = await User.findOne({ patientId, role: "patient" }).select("-password -refreshTokens");
      if (found) {
        patient = {
          patientId: found.patientId,
          username: found.username,
          fullName: found.fullName,
          email: found.email,
          mobileNumber: found.mobileNumber,
          dob: found.dob,
          gender: found.gender,
          hospitalId: found.hospitalId,
          status: found.status || "active",
          createdAt: found.createdAt,
        };
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Error fetching patient details." });
    }
  }

  if (!patient) {
    return res.status(404).json({ success: false, message: "Patient not found." });
  }

  // Fetch hospital name
  let hospitalName = "";
  if (patient.hospitalId) {
    if (process.env.USE_MOCK_DATA === "true") {
      const h = dynamicMockHospitals.find((h) => h.hospitalId === patient.hospitalId);
      hospitalName = h ? h.hospitalName : "MediFlow Hospital";
    } else {
      try {
        const h = await Hospital.findOne({ hospitalId: patient.hospitalId });
        hospitalName = h ? h.hospitalName : "";
      } catch (err) {
        console.error(err);
      }
    }
  }

  return res.status(200).json({
    success: true,
    patient,
    hospitalName,
  });
};

/**
 * PUT /api/patient/admin/update/:patientId
 * Updates demographic and account status for a patient.
 */
export const updatePatientDetailByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const patientId = req.params.patientId as string;
  const isAllowed = await canAccessPatient(req.user, patientId);
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: "Forbidden. Patient does not belong to your hospital." });
  }

  const { fullName, email, mobileNumber, dob, gender, status } = req.body;

  if (!fullName || !email || !mobileNumber || !dob || !gender || !status) {
    return res.status(400).json({ success: false, message: "Required fields are missing: fullName, email, mobileNumber, dob, gender, status." });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check unique email (excluding current user)
  if (process.env.USE_MOCK_DATA === "true") {
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail && u.patientId !== patientId
    );
    if (emailExists) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }

    const patient = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    patient.fullName = fullName.trim();
    patient.email = cleanEmail;
    patient.mobileNumber = mobileNumber.trim();
    patient.dob = dob;
    patient.gender = gender;
    patient.status = status;

    return res.status(200).json({
      success: true,
      message: "Patient details updated successfully.",
      patient: {
        patientId: patient.patientId,
        fullName: patient.fullName,
        email: patient.email,
        mobileNumber: patient.mobileNumber,
        dob: patient.dob,
        gender: patient.gender,
        status: patient.status,
      },
    });
  } else {
    try {
      const existingUser = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
        patientId: { $ne: patientId },
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }

      const updated = await User.findOneAndUpdate(
        { patientId, role: "patient" },
        {
          $set: {
            fullName: fullName.trim(),
            email: cleanEmail,
            mobileNumber: mobileNumber.trim(),
            dob,
            gender,
            status,
          },
        },
        { new: true }
      ).select("-password -refreshTokens");

      if (!updated) {
        return res.status(404).json({ success: false, message: "Patient not found." });
      }

      return res.status(200).json({
        success: true,
        message: "Patient details updated successfully.",
        patient: updated,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Failed to update patient details." });
    }
  }
};

/**
 * Helper: Generate unique patientId continuing the existing PAT sequence.
 */
const getNextPatientIdForAdmin = async (): Promise<string> => {
  let maxId = 106; // Standard seeded users go PAT-101 to PAT-106

  if (process.env.USE_MOCK_DATA === "true") {
    for (const u of dynamicMockUsers) {
      if (u.role === "patient" && u.patientId && u.patientId.startsWith("PAT-")) {
        const num = parseInt(u.patientId.substring(4), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  } else {
    try {
      const users = await User.find({ role: "patient", patientId: { $ne: null } });
      for (const u of users) {
        if (u.patientId && u.patientId.startsWith("PAT-")) {
          const num = parseInt(u.patientId.substring(4), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    } catch (e) {
      console.error("Error finding max patientId in DB:", e);
    }
  }

  return `PAT-${maxId + 1}`;
};

/**
 * POST /api/patient/admin/create
 * Creates/enrolls a new patient by the Hospital Admin.
 */
export const createPatientByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const { fullName, email, mobileNumber, dob, gender } = req.body;

  if (!fullName || !email || !mobileNumber || !dob || !gender) {
    return res.status(400).json({ success: false, message: "All fields are required: fullName, email, mobileNumber, dob, gender." });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check unique email
  if (process.env.USE_MOCK_DATA === "true") {
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }
  } else {
    try {
      const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error checking email uniqueness." });
    }
  }

  // Get Admin's hospitalId
  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  const patientId = await getNextPatientIdForAdmin();
  const tempPassword = `Temp!${crypto.randomBytes(3).toString("hex")}`;
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  if (process.env.USE_MOCK_DATA === "true") {
    const newMockPatient = {
      username: patientId,
      passwordHash,
      role: "patient" as const,
      patientId,
      hospitalId,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobileNumber: mobileNumber.trim(),
      dob,
      gender,
      isEmailVerified: true,
      status: "active",
      mustChangePassword: true,
      refreshTokens: [] as string[],
      emailVerificationToken: undefined,
      emailVerificationTokenExpires: undefined,
      passwordResetToken: undefined,
      passwordResetTokenExpires: undefined,
      medicalRegistrationNumber: undefined,
      hospitalClinicName: undefined,
      specialization: undefined,
    };
    dynamicMockUsers.push(newMockPatient);

    return res.status(201).json({
      success: true,
      message: "Patient enrolled successfully.",
      patient: {
        patientId,
        username: patientId,
        fullName: newMockPatient.fullName,
        email: newMockPatient.email,
        mobileNumber: newMockPatient.mobileNumber,
        dob: newMockPatient.dob,
        gender: newMockPatient.gender,
        hospitalId: newMockPatient.hospitalId,
      },
      temporaryPassword: tempPassword,
    });
  }

  try {
    const newPatientUser = await User.create({
      username: patientId,
      password: passwordHash,
      role: "patient",
      patientId,
      hospitalId,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobileNumber: mobileNumber.trim(),
      dob,
      gender,
      isEmailVerified: true,
      mustChangePassword: true,
    });

    return res.status(201).json({
      success: true,
      message: "Patient enrolled successfully.",
      patient: {
        patientId,
        username: patientId,
        fullName: newPatientUser.fullName,
        email: newPatientUser.email,
        mobileNumber: newPatientUser.mobileNumber,
        dob: newPatientUser.dob,
        gender: newPatientUser.gender,
        hospitalId: newPatientUser.hospitalId,
      },
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error("Enroll patient error:", error);
    return res.status(500).json({ success: false, message: "Failed to enroll patient." });
  }
};

/**
 * GET /api/patient/admin/list
 * Lists all patients in the admin's hospital.
 */
export const listPatientsByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const hospitalPatients = dynamicMockUsers.filter(
      (u) => u.role === "patient" && u.hospitalId === hospitalId
    );
    return res.status(200).json({
      success: true,
      patients: hospitalPatients.map(u => ({
        patientId: u.patientId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        dob: u.dob,
        gender: u.gender,
        hospitalId: u.hospitalId,
        status: u.status || "active",
        createdAt: (u as any).createdAt || new Date().toISOString(),
      })),
    });
  }

  try {
    const hospitalPatients = await User.find({
      role: "patient",
      hospitalId,
    }).select("-password -refreshTokens");

    return res.status(200).json({
      success: true,
      patients: hospitalPatients,
    });
  } catch (error) {
    console.error("List patients error:", error);
    return res.status(500).json({ success: false, message: "Failed to list patients." });
  }
};

/**
 * GET /api/patient/admin/search
 * Searches patients in the admin's hospital.
 */
export const searchPatientsByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const query = String(req.query.q || "").trim().toLowerCase();

  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const hospitalPatients = dynamicMockUsers.filter(
      (u) => u.role === "patient" && u.hospitalId === hospitalId
    );

    const filtered = hospitalPatients.filter((u) => {
      if (!query) return true;
      const matchName = String(u.fullName || "").toLowerCase().includes(query);
      const matchEmail = String(u.email || "").toLowerCase().includes(query);
      const matchId = String(u.patientId || "").toLowerCase().includes(query);
      return matchName || matchEmail || matchId;
    });

    return res.status(200).json({
      success: true,
      patients: filtered.map(u => ({
        patientId: u.patientId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        dob: u.dob,
        gender: u.gender,
        hospitalId: u.hospitalId,
        status: u.status || "active",
        createdAt: (u as any).createdAt || new Date().toISOString(),
      })),
    });
  }

  try {
    const queryCond: any = {
      role: "patient",
      hospitalId,
    };

    if (query) {
      queryCond.$or = [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { patientId: { $regex: query, $options: "i" } },
      ];
    }

    const matchedPatients = await User.find(queryCond).select("-password -refreshTokens");

    return res.status(200).json({
      success: true,
      patients: matchedPatients,
    });
  } catch (error) {
    console.error("Search patients error:", error);
    return res.status(500).json({ success: false, message: "Failed to search patients." });
  }
};

// ==============================
// Add New Health Record (For Patient Only)
// ==============================
export const addHealthRecord = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role !== "patient") {
    return res.status(403).json({ success: false, message: "Forbidden. Only patients can submit records." });
  }

  const { parameter, value, unit, recordedAt } = req.body;

  if (!parameter || value === undefined || value === null) {
    return res.status(400).json({
      success: false,
      message: "Parameter and value are required.",
    });
  }

  // Validate parameter name
  const validParameters = [
    "blood_sugar",
    "blood_pressure",
    "weight",
    "heart_rate",
    "body_temperature",
  ];

  if (!validParameters.includes(parameter)) {
    return res.status(400).json({
      success: false,
      message: `Invalid parameter: ${parameter}. Must be one of: ${validParameters.join(", ")}`,
    });
  }

  // Validate value format
  if (parameter === "blood_pressure") {
    const bpStr = String(value).trim();
    const parts = bpStr.split("/");
    if (parts.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Blood pressure must be in the format 'systolic/diastolic' (e.g., 120/80).",
      });
    }
    const systolic = Number(parts[0]);
    const diastolic = Number(parts[1]);
    if (isNaN(systolic) || systolic <= 0 || isNaN(diastolic) || diastolic <= 0) {
      return res.status(400).json({
        success: false,
        message: "Blood pressure systolic and diastolic must be positive numbers.",
      });
    }
  } else {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal <= 0) {
      return res.status(400).json({
        success: false,
        message: `${parameter.replace("_", " ")} must be a positive number.`,
      });
    }
  }

  const patientId = user.patientId;
  if (!patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. Patient ID not found." });
  }

  const recordDate = recordedAt ? new Date(recordedAt) : new Date();
  const whatsappMessageId = `portal_${patientId}_${parameter}_${Date.now()}`;

  const recordPayload = {
    patientId,
    parameter,
    value: parameter === "blood_pressure" ? String(value).trim() : Number(value),
    unit: unit || "",
    recordedAt: recordDate,
    source: "portal",
    confidence: 1.0,
    originalMessage: `Submitted via Patient Portal: ${parameter} = ${value} ${unit || ""}`,
    whatsappMessageId,
  };

  if (process.env.USE_MOCK_DATA === "true") {
    if (!MOCK_RECORDS[patientId]) {
      MOCK_RECORDS[patientId] = [];
    }
    MOCK_RECORDS[patientId].push(recordPayload);

    return res.status(201).json({
      success: true,
      message: "Health record submitted successfully (mock mode).",
      record: recordPayload,
    });
  }

  try {
    const record = await HealthRecord.create(recordPayload);
    return res.status(201).json({
      success: true,
      message: "Health record submitted successfully.",
      record,
    });
  } catch (error) {
    console.error("Error creating health record:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save health record.",
    });
  }
};

/**
 * Helper to check if a user has access to a specific patient.
 * If user is a patient, they can only access their own.
 * If user is an admin, they can only access patients within their own hospital.
 * If user is a doctor, they can only access patients within their own hospital AND who are actively assigned to them.
 */
export const canAccessPatient = async (reqUser: any, patientId: string): Promise<boolean> => {
  if (!reqUser) return false;

  if (reqUser.role === "patient") {
    return reqUser.patientId === patientId;
  }

  // Get requesting user's hospitalId and doctorId (if doctor)
  let reqUserHospitalId = "";
  let doctorId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.username === reqUser.username);
    if (matched) {
      reqUserHospitalId = matched.hospitalId;
      doctorId = matched.doctorId;
    }
  } else {
    try {
      const matched = await User.findOne({ username: reqUser.username });
      if (matched) {
        reqUserHospitalId = matched.hospitalId || "";
        doctorId = matched.doctorId || "";
      }
    } catch (e) {
      console.error("Error fetching request user for access control:", e);
    }
  }

  if (!reqUserHospitalId) return false;

  // Get target patient's hospitalId
  let targetHospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    if (matched) {
      targetHospitalId = matched.hospitalId;
    }
  } else {
    try {
      const matched = await User.findOne({ patientId, role: "patient" });
      if (matched) {
        targetHospitalId = matched.hospitalId || "";
      }
    } catch (e) {
      console.error("Error fetching target patient for access control:", e);
    }
  }

  if (reqUserHospitalId !== targetHospitalId) return false;

  // If role is doctor, additionally check Doctor-Patient active assignment
  if (reqUser.role === "doctor") {
    if (!doctorId) return false;
    if (process.env.USE_MOCK_DATA === "true") {
      const hasAssignment = dynamicMockAssignments.some(
        (a) => a.doctorId === doctorId && a.patientId === patientId && a.status === "active" && a.hospitalId === reqUserHospitalId
      );
      return hasAssignment;
    } else {
      try {
        const hasAssignment = await Assignment.findOne({
          doctorId,
          patientId,
          status: "active",
          hospitalId: reqUserHospitalId,
        });
        return !!hasAssignment;
      } catch (err) {
        console.error("Error checking assignment for Doctor:", err);
        return false;
      }
    }
  }

  return true; // Hospital Admin (role === "admin") retains hospital-wide administrative patient access.
};

// ==============================
// Get Patient Timeline
// ==============================
export const getPatientTimeline = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const allowed = await canAccessPatient(user, patientId);
  if (!allowed) {
    return res.status(403).json({ success: false, message: "Forbidden. You do not have access to this patient's records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = [...(MOCK_RECORDS[patientId] || [])].reverse();
    return res.status(200).json({
      success: true,
      totalRecords: records.length,
      records,
    });
  }

  try {
    const records = await HealthRecord.find({
      patientId,
    })
      .sort({
        recordedAt: -1,
      })
      .select(
        "-_id parameter value unit recordedAt source confidence originalMessage"
      );

    return res.status(200).json({
      success: true,
      totalRecords: records.length,
      records,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient timeline.",
    });
  }
};

// ==============================
// Get Patient Summary
// ==============================
export const getPatientSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const allowed = await canAccessPatient(user, patientId);
  if (!allowed) {
    return res.status(403).json({ success: false, message: "Forbidden. You do not have access to this patient's records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = [...(MOCK_RECORDS[patientId] || [])].reverse();
    const latest: Record<string, any> = {};

    for (const record of records) {
      if (!latest[record.parameter]) {
        latest[record.parameter] = {
          value: record.value,
          unit: record.unit,
          recordedAt: record.recordedAt,
          source: record.source,
          confidence: record.confidence,
        };
      }
    }

    return res.status(200).json({
      success: true,
      summary: latest,
    });
  }

  try {
    const records = await HealthRecord.find({
      patientId,
    }).sort({
      recordedAt: -1,
    });

    const latest: Record<string, any> = {};

    for (const record of records) {
      if (!latest[record.parameter]) {
        latest[record.parameter] = {
          value: record.value,
          unit: record.unit,
          recordedAt: record.recordedAt,
          source: record.source,
          confidence: record.confidence,
        };
      }
    }

    return res.status(200).json({
      success: true,
      summary: latest,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient summary.",
    });
  }
};

// ==============================
// Get Parameter Trend
// ==============================
export const getParameterTrend = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const allowed = await canAccessPatient(user, patientId);
  if (!allowed) {
    return res.status(403).json({ success: false, message: "Forbidden. You do not have access to this patient's records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r: any) => r.parameter === parameter)
      .map((r: any) => ({
        value: r.value,
        unit: r.unit,
        recordedAt: r.recordedAt,
      }));

    return res.json({
      success: true,
      parameter,
      days,
      count: records.length,
      records,
    });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      patientId,
      parameter,
      recordedAt: {
        $gte: startDate,
      },
    })
      .sort({
        recordedAt: 1,
      })
      .select("-_id value unit recordedAt");

    return res.json({
      success: true,
      parameter,
      days,
      count: records.length,
      records,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch trend.",
    });
  }
};

// ==============================
// Get Parameter Statistics
// ==============================
export const getParameterStatistics = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const allowed = await canAccessPatient(user, patientId);
  if (!allowed) {
    return res.status(403).json({ success: false, message: "Forbidden. You do not have access to this patient's records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r: any) => r.parameter === parameter);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found.",
      });
    }

    const numericValues = records
      .map((record: any) => Number(record.value))
      .filter((value: any) => !isNaN(value));

    const latest = numericValues[numericValues.length - 1] || 0;
    const minimum = numericValues.length > 0 ? Math.min(...numericValues) : 0;
    const maximum = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    const average = numericValues.length > 0
      ? numericValues.reduce((sum: any, value: any) => sum + value, 0) / numericValues.length
      : 0;

    return res.json({
      success: true,
      parameter,
      days,
      statistics: {
        latest,
        minimum,
        maximum,
        average: Number(average.toFixed(2)),
        totalReadings: numericValues.length,
      },
    });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      patientId,
      parameter,
      recordedAt: {
        $gte: startDate,
      },
    }).sort({
      recordedAt: 1,
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found.",
      });
    }

    const numericValues = records
      .map((record) => Number(record.value))
      .filter((value) => !isNaN(value));

    const latest = numericValues[numericValues.length - 1];
    const minimum = Math.min(...numericValues);
    const maximum = Math.max(...numericValues);
    const average =
      numericValues.reduce((sum, value) => sum + value, 0) /
      numericValues.length;

    return res.json({
      success: true,
      parameter,
      days,
      statistics: {
        latest,
        minimum,
        maximum,
        average: Number(average.toFixed(2)),
        totalReadings: numericValues.length,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch statistics.",
    });
  }
};
