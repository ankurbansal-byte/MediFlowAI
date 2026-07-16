import { Router } from "express";
import { authMiddleware } from "../utils/authMiddleware";

import {
  getPatients,
  getPatientTimeline,
  getPatientSummary,
  getParameterTrend,
  getParameterStatistics,
  addHealthRecord,
} from "../controllers/patientController";

const router = Router();

// Apply authMiddleware to protect all patient routes
router.use(authMiddleware);

router.get("/", getPatients);

router.post("/record", addHealthRecord);

router.get("/timeline/:patientId", getPatientTimeline);

router.get("/summary/:patientId", getPatientSummary);

router.get(
  "/trend/:patientId/:parameter",
  getParameterTrend
);

router.get(
  "/statistics/:patientId/:parameter",
  getParameterStatistics
);

export default router;
