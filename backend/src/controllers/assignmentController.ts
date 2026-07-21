import { Response } from "express";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import User from "../models/User";
import Assignment from "../models/Assignment";
import { dynamicMockUsers, dynamicMockAssignments } from "../utils/mockUsers";

/**
 * Helper to fetch a user's hospitalId (handles both real DB and mock mode).
 */
const getHospitalIdForUser = async (username: string): Promise<string> => {
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.username === username);
    return matched ? matched.hospitalId : "";
  } else {
    const matched = await User.findOne({ username });
    return matched ? matched.hospitalId || "" : "";
  }
};

/**
 * POST /api/assignment/assign
 * Enrolls/Creates a doctor-patient assignment (Admin only).
 */
export const assignPatientToDoctor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const { doctorId, patientId } = req.body;
  if (!doctorId || !patientId) {
    return res.status(400).json({ success: false, message: "Both doctorId and patientId are required." });
  }

  try {
    const adminHospitalId = await getHospitalIdForUser(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Admin has no hospital associated." });
    }

    // Check doctor existence and hospital level tenant isolation
    let doctor: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      doctor = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    } else {
      doctor = await User.findOne({ doctorId, role: "doctor" });
    }

    if (!doctor) {
      return res.status(404).json({ success: false, message: `Doctor ${doctorId} not found.` });
    }
    if (doctor.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Doctor belongs to a different hospital." });
    }

    // Check patient existence and hospital level tenant isolation
    let patient: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      patient = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    } else {
      patient = await User.findOne({ patientId, role: "patient" });
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: `Patient ${patientId} not found.` });
    }
    if (patient.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Patient belongs to a different hospital." });
    }

    // Prevent duplicate active assignments of same doctor to same patient
    let existingActive: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      existingActive = dynamicMockAssignments.find(
        (a) => a.doctorId === doctorId && a.patientId === patientId && a.status === "active" && a.hospitalId === adminHospitalId
      );
    } else {
      existingActive = await Assignment.findOne({
        doctorId,
        patientId,
        status: "active",
        hospitalId: adminHospitalId,
      });
    }

    if (existingActive) {
      return res.status(400).json({ success: false, message: "Patient is already actively assigned to this doctor." });
    }

    // Create assignment
    if (process.env.USE_MOCK_DATA === "true") {
      const newMockAssignment = {
        hospitalId: adminHospitalId,
        doctorId,
        patientId,
        status: "active",
        assignedAt: new Date(),
        assignedBy: req.user.username,
      };
      dynamicMockAssignments.push(newMockAssignment);
    } else {
      await Assignment.create({
        hospitalId: adminHospitalId,
        doctorId,
        patientId,
        status: "active",
        assignedBy: req.user.username,
      });
    }

    return res.status(201).json({ success: true, message: "Doctor-Patient assignment successfully created." });
  } catch (error) {
    console.error("Assign patient to doctor error:", error);
    return res.status(500).json({ success: false, message: "Failed to create assignment." });
  }
};

/**
 * POST /api/assignment/remove
 * Deactivates/removes a patient assignment from a doctor (Admin only).
 */
export const removePatientAssignment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const { doctorId, patientId } = req.body;
  if (!doctorId || !patientId) {
    return res.status(400).json({ success: false, message: "Both doctorId and patientId are required." });
  }

  try {
    const adminHospitalId = await getHospitalIdForUser(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Admin has no hospital associated." });
    }

    // Check doctor existence and hospital level tenant isolation
    let doctor: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      doctor = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    } else {
      doctor = await User.findOne({ doctorId, role: "doctor" });
    }

    if (!doctor || doctor.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Doctor does not belong to your hospital." });
    }

    // Check patient existence and hospital level tenant isolation
    let patient: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      patient = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    } else {
      patient = await User.findOne({ patientId, role: "patient" });
    }

    if (!patient || patient.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Patient does not belong to your hospital." });
    }

    // Deactivate assignment
    if (process.env.USE_MOCK_DATA === "true") {
      const idx = dynamicMockAssignments.findIndex(
        (a) => a.doctorId === doctorId && a.patientId === patientId && a.status === "active" && a.hospitalId === adminHospitalId
      );
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "No active assignment found to remove." });
      }
      dynamicMockAssignments[idx].status = "inactive";
    } else {
      const updated = await Assignment.findOneAndUpdate(
        { doctorId, patientId, status: "active", hospitalId: adminHospitalId },
        { $set: { status: "inactive" } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: "No active assignment found to remove." });
      }
    }

    return res.status(200).json({ success: true, message: "Assignment successfully deactivated." });
  } catch (error) {
    console.error("Remove assignment error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove assignment." });
  }
};

/**
 * GET /api/assignment/doctor/:doctorId/patients
 * List patients assigned to a specific doctor (Admin & authorized Doctor).
 */
export const listPatientsAssignedToDoctor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "doctor")) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin or Doctor access required." });
  }

  const doctorId = req.params.doctorId;

  try {
    const userHospitalId = await getHospitalIdForUser(req.user.username);
    if (!userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. User has no hospital associated." });
    }

    // If requesting user is doctor, ensure they are requesting their own patients
    if (req.user.role === "doctor") {
      let reqDoctorId = "";
      if (process.env.USE_MOCK_DATA === "true") {
        const matched = dynamicMockUsers.find((u) => u.username === req.user?.username);
        reqDoctorId = matched ? matched.doctorId : "";
      } else {
        const matched = await User.findOne({ username: req.user.username });
        reqDoctorId = matched ? matched.doctorId || "" : "";
      }
      if (!reqDoctorId || reqDoctorId !== doctorId) {
        return res.status(403).json({ success: false, message: "Forbidden. You can only view your own assigned patients." });
      }
    }

    // Verify doctor belongs to user's hospital
    let doctor: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      doctor = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    } else {
      doctor = await User.findOne({ doctorId, role: "doctor" });
    }

    if (!doctor || doctor.hospitalId !== userHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Doctor does not belong to your hospital." });
    }

    // Fetch assignments
    let activeAssignments: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      activeAssignments = dynamicMockAssignments.filter(
        (a) => a.doctorId === doctorId && a.status === "active" && a.hospitalId === userHospitalId
      );
    } else {
      activeAssignments = await Assignment.find({
        doctorId,
        status: "active",
        hospitalId: userHospitalId,
      }).sort({ assignedAt: -1 });
    }

    // Fetch Patient Details
    const patientsList: any[] = [];
    for (const assoc of activeAssignments) {
      let pUser: any = null;
      if (process.env.USE_MOCK_DATA === "true") {
        pUser = dynamicMockUsers.find((u) => u.patientId === assoc.patientId && u.role === "patient");
      } else {
        pUser = await User.findOne({ patientId: assoc.patientId, role: "patient" }).select("-password -refreshTokens");
      }

      if (pUser) {
        patientsList.push({
          patientId: pUser.patientId,
          fullName: pUser.fullName,
          gender: pUser.gender,
          dob: pUser.dob,
          email: pUser.email,
          mobileNumber: pUser.mobileNumber,
          status: pUser.status || "active",
          assignedAt: assoc.assignedAt,
        });
      }
    }

    return res.status(200).json({ success: true, patients: patientsList });
  } catch (error) {
    console.error("List assigned patients error:", error);
    return res.status(500).json({ success: false, message: "Failed to list assigned patients." });
  }
};

/**
 * GET /api/assignment/patient/:patientId/doctors
 * List doctors assigned to a specific patient (Admin only).
 */
export const listDoctorsAssignedToPatient = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const patientId = req.params.patientId;

  try {
    const adminHospitalId = await getHospitalIdForUser(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Admin has no hospital associated." });
    }

    // Verify patient belongs to admin's hospital
    let patient: any = null;
    if (process.env.USE_MOCK_DATA === "true") {
      patient = dynamicMockUsers.find((u) => u.patientId === patientId && u.role === "patient");
    } else {
      patient = await User.findOne({ patientId, role: "patient" });
    }

    if (!patient || patient.hospitalId !== adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden. Patient does not belong to your hospital." });
    }

    // Fetch assignments
    let activeAssignments: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      activeAssignments = dynamicMockAssignments.filter(
        (a) => a.patientId === patientId && a.status === "active" && a.hospitalId === adminHospitalId
      );
    } else {
      activeAssignments = await Assignment.find({
        patientId,
        status: "active",
        hospitalId: adminHospitalId,
      }).sort({ assignedAt: -1 });
    }

    // Fetch Doctor Details
    const doctorsList: any[] = [];
    for (const assoc of activeAssignments) {
      let dUser: any = null;
      if (process.env.USE_MOCK_DATA === "true") {
        dUser = dynamicMockUsers.find((u) => u.doctorId === assoc.doctorId && u.role === "doctor");
      } else {
        dUser = await User.findOne({ doctorId: assoc.doctorId, role: "doctor" }).select("-password -refreshTokens");
      }

      if (dUser) {
        doctorsList.push({
          doctorId: dUser.doctorId,
          fullName: dUser.fullName,
          department: dUser.department,
          specialization: dUser.specialization,
          qualification: dUser.qualification,
          status: dUser.status || "active",
          assignedAt: assoc.assignedAt,
        });
      }
    }

    return res.status(200).json({ success: true, doctors: doctorsList });
  } catch (error) {
    console.error("List assigned doctors error:", error);
    return res.status(500).json({ success: false, message: "Failed to list assigned doctors." });
  }
};

/**
 * GET /api/assignment/available-patients
 * List patients in the admin's hospital who are NOT assigned to a given doctor.
 */
export const listAvailablePatients = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const doctorId = req.query.doctorId as string;
  if (!doctorId) {
    return res.status(400).json({ success: false, message: "doctorId query parameter is required." });
  }

  try {
    const adminHospitalId = await getHospitalIdForUser(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Get active assignments of this doctor
    let assignedPatientIds: string[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      assignedPatientIds = dynamicMockAssignments
        .filter((a) => a.doctorId === doctorId && a.status === "active" && a.hospitalId === adminHospitalId)
        .map((a) => a.patientId);
    } else {
      assignedPatientIds = await Assignment.find({
        doctorId,
        status: "active",
        hospitalId: adminHospitalId,
      }).distinct("patientId");
    }

    // Get all patients in the admin's hospital
    let hospitalPatients: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      hospitalPatients = dynamicMockUsers.filter(
        (u) => u.role === "patient" && u.hospitalId === adminHospitalId && u.status === "active"
      );
    } else {
      hospitalPatients = await User.find({
        role: "patient",
        hospitalId: adminHospitalId,
        status: "active",
      }).select("-password -refreshTokens");
    }

    // Filter out already assigned patients
    const availablePatients = hospitalPatients.filter(
      (p) => !assignedPatientIds.includes(p.patientId)
    ).map(p => ({
      patientId: p.patientId,
      fullName: p.fullName,
      email: p.email,
      mobileNumber: p.mobileNumber,
    }));

    return res.status(200).json({ success: true, patients: availablePatients });
  } catch (error) {
    console.error("List available patients error:", error);
    return res.status(500).json({ success: false, message: "Failed to load available patients." });
  }
};

/**
 * GET /api/assignment/available-doctors
 * List doctors in the admin's hospital who are NOT assigned to a given patient.
 */
export const listAvailableDoctors = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const patientId = req.query.patientId as string;
  if (!patientId) {
    return res.status(400).json({ success: false, message: "patientId query parameter is required." });
  }

  try {
    const adminHospitalId = await getHospitalIdForUser(req.user.username);
    if (!adminHospitalId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    // Get active assignments of this patient
    let assignedDoctorIds: string[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      assignedDoctorIds = dynamicMockAssignments
        .filter((a) => a.patientId === patientId && a.status === "active" && a.hospitalId === adminHospitalId)
        .map((a) => a.doctorId);
    } else {
      assignedDoctorIds = await Assignment.find({
        patientId,
        status: "active",
        hospitalId: adminHospitalId,
      }).distinct("doctorId");
    }

    // Get all doctors in the admin's hospital
    let hospitalDoctors: any[] = [];
    if (process.env.USE_MOCK_DATA === "true") {
      hospitalDoctors = dynamicMockUsers.filter(
        (u) => u.role === "doctor" && u.hospitalId === adminHospitalId && u.status === "active"
      );
    } else {
      hospitalDoctors = await User.find({
        role: "doctor",
        hospitalId: adminHospitalId,
        status: "active",
      }).select("-password -refreshTokens");
    }

    // Filter out already assigned doctors
    const availableDoctors = hospitalDoctors.filter(
      (d) => !assignedDoctorIds.includes(d.doctorId)
    ).map(d => ({
      doctorId: d.doctorId,
      fullName: d.fullName,
      department: d.department,
      specialization: d.specialization,
    }));

    return res.status(200).json({ success: true, doctors: availableDoctors });
  } catch (error) {
    console.error("List available doctors error:", error);
    return res.status(500).json({ success: false, message: "Failed to load available doctors." });
  }
};
