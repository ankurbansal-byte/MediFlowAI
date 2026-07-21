import { Response } from "express";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import User from "../models/User";
import Assignment from "../models/Assignment";
import Encounter from "../models/Encounter";
import { dynamicMockUsers, dynamicMockAssignments } from "../utils/mockUsers";
import { dynamicMockEncounters, EncounterMock } from "../utils/mockEncounters";

/**
 * Helper to fetch a user's hospitalId and doctorId (handles both real DB and mock mode).
 */
const getUserHospitalAndDoctorId = async (username: string) => {
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.username === username);
    return matched ? { hospitalId: matched.hospitalId, doctorId: matched.doctorId } : { hospitalId: "", doctorId: "" };
  } else {
    const matched = await User.findOne({ username });
    return matched ? { hospitalId: matched.hospitalId || "", doctorId: matched.doctorId || "" } : { hospitalId: "", doctorId: "" };
  }
};

/**
 * Helper: Generate unique encounterId/visitId continuing ENC-10001 sequence.
 */
const getNextEncounterId = async (): Promise<string> => {
  let maxId = 10002; // Initial seed max is ENC-10002

  if (process.env.USE_MOCK_DATA === "true") {
    for (const enc of dynamicMockEncounters) {
      if (enc.encounterId && enc.encounterId.startsWith("ENC-")) {
        const num = parseInt(enc.encounterId.substring(4), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  } else {
    try {
      const encounters = await Encounter.find({ encounterId: { $ne: null } });
      for (const enc of encounters) {
        if (enc.encounterId && enc.encounterId.startsWith("ENC-")) {
          const num = parseInt(enc.encounterId.substring(4), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    } catch (e) {
      console.error("Error finding max encounterId in DB:", e);
    }
  }

  return `ENC-${maxId + 1}`;
};

/**
 * POST /api/encounter/create
 * Creates/Registers a new OPD visit/clinical encounter (Admin only).
 * Automatically ensures Doctor-Patient assignment if it does not already exist.
 */
export const createEncounter = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const { patientId, doctorId, visitDate, visitType, chiefComplaint } = req.body;

  if (!patientId || !doctorId || !visitDate || !visitType) {
    return res.status(400).json({ success: false, message: "Required fields are missing: patientId, doctorId, visitDate, visitType." });
  }

  try {
    const { hospitalId: adminHospitalId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Admin has no hospital associated." });
    }

    // 1. Verify Patient existence, status, and hospital tenant isolation
    let patient: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      patient = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    } else {
      patient = await User.findOne({ patientId, role: "patient" });
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }
    if (patient.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Patient belongs to a different hospital." });
    }
    if (patient.status === "inactive") {
      return res.status(400).json({ success: false, message: "Cannot register OPD visit for an inactive patient." });
    }

    // 2. Verify Doctor existence, status, and hospital tenant isolation
    let doctor: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      doctor = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    } else {
      doctor = await User.findOne({ doctorId, role: "doctor" });
    }

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }
    if (doctor.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Doctor belongs to a different hospital." });
    }
    if (doctor.status === "inactive") {
      return res.status(400).json({ success: false, message: "Cannot register OPD visit with an inactive doctor." });
    }

    // 3. Automatically generate a unique Visit / Encounter ID
    const encounterId = await getNextEncounterId();

    // 4. Ensure Doctor-Patient active assignment exists safely without duplicating
    let existingAssignment: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      existingAssignment = dynamicMockAssignments.find(
        (a) => a.doctorId === doctorId && a.patientId === patientId && a.status === "active" && a.hospitalId === adminHospitalId
      );
    } else {
      existingAssignment = await Assignment.findOne({
        doctorId,
        patientId,
        status: "active",
        hospitalId: adminHospitalId,
      });
    }

    if (!existingAssignment) {
      if (process.env.USE_MOCK_DATA === "true") {
        dynamicMockAssignments.push({
          hospitalId: adminHospitalId,
          doctorId,
          patientId,
          status: "active",
          assignedAt: new Date(),
          assignedBy: req.user.username,
        });
      } else {
        await Assignment.create({
          hospitalId: adminHospitalId,
          doctorId,
          patientId,
          status: "active",
          assignedBy: req.user.username,
        });
      }
    }

    // 5. Create the Encounter
    const payload = {
      encounterId,
      hospitalId: adminHospitalId,
      patientId,
      doctorId,
      visitDate: new Date(visitDate),
      visitType,
      chiefComplaint: chiefComplaint || "",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "draft" as const,
      createdBy: req.user.username,
    };

    let created: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      const mockEnc: EncounterMock = {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dynamicMockEncounters.push(mockEnc);
      created = mockEnc;
    } else {
      created = await Encounter.create(payload);
    }

    return res.status(201).json({
      success: true,
      message: "Clinical Encounter registered successfully.",
      encounter: created,
    });
  } catch (error) {
    console.error("Create encounter error:", error);
    return res.status(500).json({ success: false, message: "Failed to create Clinical Encounter." });
  }
};

/**
 * GET /api/encounter/detail/:encounterId
 * Returns the full details of a specific clinical encounter.
 * Enforces strict authorization.
 */
export const getEncounterDetail = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { encounterId } = req.params;

  try {
    const { hospitalId: userHospitalId, doctorId: userDoctorId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. User has no hospital associated." });
    }

    // Retrieve encounter
    let encounter: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      encounter = dynamicMockEncounters.find((e) => e.encounterId === encounterId);
    } else {
      encounter = await Encounter.findOne({ encounterId });
    }

    if (!encounter) {
      return res.status(404).json({ success: false, message: "Encounter not found." });
    }

    // Cross-hospital access is forbidden
    if (encounter.hospitalId !== userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Encounter belongs to a different hospital." });
    }

    // Role-based verification
    if (req.user.role === "admin") {
      // Admin same hospital has complete access
    } else if (req.user.role === "doctor") {
      // Doctor can only access if they are the assigned doctor for this encounter
      if (encounter.doctorId !== userDoctorId) {
        return res.status(403).json({ success: false, message: "Forbidden. You are not the assigned doctor for this encounter." });
      }
    } else if (req.user.role === "patient") {
      // Patient can only access their own completed/available encounters
      if (encounter.patientId !== req.user.patientId) {
        return res.status(403).json({ success: false, message: "Forbidden. You cannot access another patient's encounter." });
      }
      if (encounter.status !== "completed") {
        return res.status(403).json({ success: false, message: "Forbidden. Encounter details are not available yet." });
      }
    } else {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Fetch doctor and patient full names to present in detail
    let pName = "";
    let dName = "";
    if (process.env.USE_MOCK_DATA === "true") {
      const p = dynamicMockUsers.find((u) => u.patientId === encounter.patientId && u.role === "patient");
      const d = dynamicMockUsers.find((u) => u.doctorId === encounter.doctorId && u.role === "doctor");
      pName = p ? p.fullName : encounter.patientId;
      dName = d ? d.fullName : encounter.doctorId;
    } else {
      const p = await User.findOne({ patientId: encounter.patientId, role: "patient" });
      const d = await User.findOne({ doctorId: encounter.doctorId, role: "doctor" });
      pName = p ? p.fullName : encounter.patientId;
      dName = d ? d.fullName : encounter.doctorId;
    }

    return res.status(200).json({
      success: true,
      encounter,
      patientName: pName,
      doctorName: dName,
    });
  } catch (error) {
    console.error("Get encounter detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch encounter details." });
  }
};

/**
 * GET /api/encounter/patient/:patientId
 * Lists all clinical encounters for a patient.
 */
export const listPatientEncounters = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { patientId } = req.params;

  try {
    const { hospitalId: userHospitalId, doctorId: userDoctorId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Role-based restrictions
    if (req.user.role === "patient") {
      if (req.user.patientId !== patientId) {
        return res.status(403).json({ success: false, message: "Forbidden. You cannot view another patient's encounters." });
      }
    } else if (req.user.role === "doctor") {
      // Doctor must be actively assigned to this patient in the same hospital
      let hasAssignment = false;
      if (process.env.USE_MOCK_DATA === "true") {
        hasAssignment = dynamicMockAssignments.some(
          (a) => a.doctorId === userDoctorId && a.patientId === patientId && a.status === "active" && a.hospitalId === userHospitalId
        );
      } else {
        hasAssignment = !!(await Assignment.findOne({
          doctorId: userDoctorId,
          patientId,
          status: "active",
          hospitalId: userHospitalId,
        }));
      }

      if (!hasAssignment) {
        return res.status(403).json({ success: false, message: "Forbidden. You must be actively assigned to this patient's care team." });
      }
    } else if (req.user.role === "admin") {
      // Verify patient belongs to Admin's hospital
      let pTenant = null;
      if (process.env.USE_MOCK_DATA === "true") {
        pTenant = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
      } else {
        pTenant = await User.findOne({ patientId, role: "patient" });
      }
      if (!pTenant || pTenant.hospitalId !== userHospitalId) {
        return res.status(403).json({ success: false, message: "Forbidden. Patient does not belong to your hospital." });
      }
    }

    // Retrieve encounters
    let list: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      list = dynamicMockEncounters.filter((e) => e.patientId === patientId && e.hospitalId === userHospitalId);
    } else {
      list = await Encounter.find({ patientId, hospitalId: userHospitalId }).sort({ visitDate: -1 });
    }

    // If patient, strip out draft encounters
    if (req.user.role === "patient") {
      list = list.filter((e) => e.status === "completed");
    }

    // Hydrate names
    const hydratedList = [];
    for (const item of list) {
      let pName = "";
      let dName = "";
      if (process.env.USE_MOCK_DATA === "true") {
        const p = dynamicMockUsers.find((u) => u.patientId === item.patientId && u.role === "patient");
        const d = dynamicMockUsers.find((u) => u.doctorId === item.doctorId && u.role === "doctor");
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      } else {
        const p = await User.findOne({ patientId: item.patientId, role: "patient" });
        const d = await User.findOne({ doctorId: item.doctorId, role: "doctor" });
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      }
      hydratedList.push({
        ...((item as any).toObject ? (item as any).toObject() : item),
        patientName: pName,
        doctorName: dName,
      });
    }

    return res.status(200).json({ success: true, encounters: hydratedList });
  } catch (error) {
    console.error("List patient encounters error:", error);
    return res.status(500).json({ success: false, message: "Failed to list patient encounters." });
  }
};

/**
 * GET /api/encounter/doctor/:doctorId
 * Lists all clinical encounters for a doctor.
 */
export const listDoctorEncounters = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { doctorId } = req.params;

  try {
    const { hospitalId: userHospitalId, doctorId: userDoctorId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Role checks
    if (req.user.role === "doctor") {
      if (userDoctorId !== doctorId) {
        return res.status(403).json({ success: false, message: "Forbidden. You cannot access another doctor's encounters." });
      }
    } else if (req.user.role === "admin") {
      // Check doctor hospital matches
      let dTenant = null;
      if (process.env.USE_MOCK_DATA === "true") {
        dTenant = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
      } else {
        dTenant = await User.findOne({ doctorId, role: "doctor" });
      }
      if (!dTenant || dTenant.hospitalId !== userHospitalId) {
        return res.status(403).json({ success: false, message: "Forbidden. Doctor belongs to a different hospital." });
      }
    } else {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Retrieve
    let list: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      list = dynamicMockEncounters.filter((e) => e.doctorId === doctorId && e.hospitalId === userHospitalId);
    } else {
      list = await Encounter.find({ doctorId, hospitalId: userHospitalId }).sort({ visitDate: -1 });
    }

    const hydratedList = [];
    for (const item of list) {
      let pName = "";
      let dName = "";
      if (process.env.USE_MOCK_DATA === "true") {
        const p = dynamicMockUsers.find((u) => u.patientId === item.patientId && u.role === "patient");
        const d = dynamicMockUsers.find((u) => u.doctorId === item.doctorId && u.role === "doctor");
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      } else {
        const p = await User.findOne({ patientId: item.patientId, role: "patient" });
        const d = await User.findOne({ doctorId: item.doctorId, role: "doctor" });
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      }
      hydratedList.push({
        ...((item as any).toObject ? (item as any).toObject() : item),
        patientName: pName,
        doctorName: dName,
      });
    }

    return res.status(200).json({ success: true, encounters: hydratedList });
  } catch (error) {
    console.error("List doctor encounters error:", error);
    return res.status(500).json({ success: false, message: "Failed to list doctor encounters." });
  }
};

/**
 * GET /api/encounter/hospital
 * Lists all clinical encounters in Admin's hospital. (Admin only)
 */
export const listHospitalEncounters = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  try {
    const { hospitalId: adminHospitalId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
    }

    let list: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      list = dynamicMockEncounters.filter((e) => e.hospitalId === adminHospitalId);
    } else {
      list = await Encounter.find({ hospitalId: adminHospitalId }).sort({ visitDate: -1 });
    }

    const hydratedList = [];
    for (const item of list) {
      let pName = "";
      let dName = "";
      if (process.env.USE_MOCK_DATA === "true") {
        const p = dynamicMockUsers.find((u) => u.patientId === item.patientId && u.role === "patient");
        const d = dynamicMockUsers.find((u) => u.doctorId === item.doctorId && u.role === "doctor");
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      } else {
        const p = await User.findOne({ patientId: item.patientId, role: "patient" });
        const d = await User.findOne({ doctorId: item.doctorId, role: "doctor" });
        pName = p ? p.fullName : item.patientId;
        dName = d ? d.fullName : item.doctorId;
      }
      hydratedList.push({
        ...((item as any).toObject ? (item as any).toObject() : item),
        patientName: pName,
        doctorName: dName,
      });
    }

    return res.status(200).json({ success: true, encounters: hydratedList });
  } catch (error) {
    console.error("List hospital encounters error:", error);
    return res.status(500).json({ success: false, message: "Failed to list hospital encounters." });
  }
};

/**
 * PUT /api/encounter/update/:encounterId
 * Updates clinical notes, diagnosis, symptoms, and complaints of a draft encounter.
 * Restricted to the owning Doctor.
 */
export const updateEncounterDetail = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "doctor") {
    return res.status(403).json({ success: false, message: "Forbidden. Doctor access required." });
  }

  const { encounterId } = req.params;
  const { chiefComplaint, symptoms, provisionalDiagnosis, doctorNotes, followUpDate } = req.body;

  try {
    const { hospitalId: userHospitalId, doctorId: userDoctorId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Retrieve
    let encounter: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      encounter = dynamicMockEncounters.find((e) => e.encounterId === encounterId);
    } else {
      encounter = await Encounter.findOne({ encounterId });
    }

    if (!encounter) {
      return res.status(404).json({ success: false, message: "Encounter not found." });
    }

    // Multi-tenant check
    if (encounter.hospitalId !== userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Encounter belongs to a different hospital." });
    }

    // Owning doctor check
    if (encounter.doctorId !== userDoctorId) {
      return res.status(403).json({ success: false, message: "Forbidden. You are not the assigned doctor for this encounter." });
    }

    // Cannot casually modify completed clinical encounters
    if (encounter.status === "completed") {
      return res.status(400).json({ success: false, message: "Cannot modify a completed/closed clinical encounter." });
    }

    // Safeguard ownership against Ordinary updates
    // Let's only update permitted clinical information
    if (process.env.USE_MOCK_DATA === "true") {
      encounter.chiefComplaint = chiefComplaint !== undefined ? chiefComplaint : encounter.chiefComplaint;
      encounter.symptoms = symptoms !== undefined ? symptoms : encounter.symptoms;
      encounter.provisionalDiagnosis = provisionalDiagnosis !== undefined ? provisionalDiagnosis : encounter.provisionalDiagnosis;
      encounter.doctorNotes = doctorNotes !== undefined ? doctorNotes : encounter.doctorNotes;
      encounter.followUpDate = followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : undefined) : encounter.followUpDate;
      encounter.updatedAt = new Date();
    } else {
      await Encounter.findOneAndUpdate(
        { encounterId },
        {
          $set: {
            chiefComplaint: chiefComplaint !== undefined ? chiefComplaint : encounter.chiefComplaint,
            symptoms: symptoms !== undefined ? symptoms : encounter.symptoms,
            provisionalDiagnosis: provisionalDiagnosis !== undefined ? provisionalDiagnosis : encounter.provisionalDiagnosis,
            doctorNotes: doctorNotes !== undefined ? doctorNotes : encounter.doctorNotes,
            followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : undefined) : encounter.followUpDate,
          },
        }
      );
    }

    return res.status(200).json({ success: true, message: "Encounter clinical progress saved successfully." });
  } catch (error) {
    console.error("Update encounter error:", error);
    return res.status(500).json({ success: false, message: "Failed to update clinical encounter." });
  }
};

/**
 * POST /api/encounter/complete/:encounterId
 * Finalizes and closes a clinical encounter.
 * Restricted to the owning Doctor.
 */
export const completeEncounter = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "doctor") {
    return res.status(403).json({ success: false, message: "Forbidden. Doctor access required." });
  }

  const { encounterId } = req.params;

  try {
    const { hospitalId: userHospitalId, doctorId: userDoctorId } = await getUserHospitalAndDoctorId(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Retrieve
    let encounter: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      encounter = dynamicMockEncounters.find((e) => e.encounterId === encounterId);
    } else {
      encounter = await Encounter.findOne({ encounterId });
    }

    if (!encounter) {
      return res.status(404).json({ success: false, message: "Encounter not found." });
    }

    // Multi-tenant check
    if (encounter.hospitalId !== userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Encounter belongs to a different hospital." });
    }

    // Owning doctor check
    if (encounter.doctorId !== userDoctorId) {
      return res.status(403).json({ success: false, message: "Forbidden. You are not the assigned doctor for this encounter." });
    }

    // Finalize
    if (process.env.USE_MOCK_DATA === "true") {
      encounter.status = "completed";
      encounter.updatedAt = new Date();
    } else {
      await Encounter.findOneAndUpdate(
        { encounterId },
        {
          $set: { status: "completed" },
        }
      );
    }

    return res.status(200).json({ success: true, message: "Clinical encounter completed and closed successfully." });
  } catch (error) {
    console.error("Complete encounter error:", error);
    return res.status(500).json({ success: false, message: "Failed to close clinical encounter." });
  }
};
