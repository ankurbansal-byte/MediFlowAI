import { Router } from "express";
import { authMiddleware } from "../utils/authMiddleware";
import {
  assignPatientToDoctor,
  removePatientAssignment,
  listPatientsAssignedToDoctor,
  listDoctorsAssignedToPatient,
  listAvailablePatients,
  listAvailableDoctors,
} from "../controllers/assignmentController";

const router = Router();

// Protect all routes with authMiddleware
router.use(authMiddleware);

// Admin-only assignment management routes
router.post("/assign", assignPatientToDoctor);
router.post("/remove", removePatientAssignment);
router.get("/doctor/:doctorId/patients", listPatientsAssignedToDoctor);
router.get("/patient/:patientId/doctors", listDoctorsAssignedToPatient);
router.get("/available-patients", listAvailablePatients);
router.get("/available-doctors", listAvailableDoctors);

export default router;
