import { Router } from "express";
import { authMiddleware } from "../utils/authMiddleware";

import {
  createDoctorByAdmin,
  listDoctorsByAdmin,
  searchDoctorsByAdmin,
  getDoctorDetailByAdmin,
  updateDoctorDetailByAdmin,
} from "../controllers/doctorController";

const router = Router();

// Apply authMiddleware to protect all doctor routes
router.use(authMiddleware);

// Admin-only doctor management routes
router.post("/admin/create", createDoctorByAdmin);
router.get("/admin/list", listDoctorsByAdmin);
router.get("/admin/search", searchDoctorsByAdmin);
router.get("/admin/detail/:doctorId", getDoctorDetailByAdmin);
router.put("/admin/update/:doctorId", updateDoctorDetailByAdmin);

export default router;
