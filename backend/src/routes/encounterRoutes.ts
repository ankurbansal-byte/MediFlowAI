import { Router } from "express";
import { authMiddleware } from "../utils/authMiddleware";

import {
  createEncounter,
  getEncounterDetail,
  listPatientEncounters,
  listDoctorEncounters,
  listHospitalEncounters,
  updateEncounterDetail,
  completeEncounter,
} from "../controllers/encounterController";

const router = Router();

// Apply authMiddleware to protect all encounter routes
router.use(authMiddleware);

router.post("/create", createEncounter);
router.get("/detail/:encounterId", getEncounterDetail);
router.get("/patient/:patientId", listPatientEncounters);
router.get("/doctor/:doctorId", listDoctorEncounters);
router.get("/hospital", listHospitalEncounters);
router.put("/update/:encounterId", updateEncounterDetail);
router.post("/complete/:encounterId", completeEncounter);

export default router;
