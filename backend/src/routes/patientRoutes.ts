import { Router } from "express";
import { authMiddleware } from "../utils/authMiddleware";

import {
  getPatients,
  getPatientTimeline,
  getPatientSummary,
  getParameterTrend,
  getParameterStatistics,
  addHealthRecord,
  createPatientByAdmin,
  listPatientsByAdmin,
  searchPatientsByAdmin,
  getPatientDetailByAdmin,
  updatePatientDetailByAdmin,
} from "../controllers/patientController";

const router = Router();

// Apply authMiddleware to protect all patient routes
router.use(authMiddleware);

// Admin-only patient management routes (authMiddleware protects them, roles are checked inside controllers)
router.post("/admin/create", createPatientByAdmin);
router.get("/admin/list", listPatientsByAdmin);
router.get("/admin/search", searchPatientsByAdmin);
router.get("/admin/detail/:patientId", getPatientDetailByAdmin);
router.put("/admin/update/:patientId", updatePatientDetailByAdmin);

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
