import { Router } from "express";

import {
  getPatients,
  getPatientTimeline,
  getPatientSummary,
  getParameterTrend,
  getParameterStatistics,
} from "../controllers/patientController";

const router = Router();

router.get("/", getPatients);

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
