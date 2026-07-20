import { Router } from "express";
import { getCurrentHospital, getHospitalById } from "../controllers/hospitalController";
import { authMiddleware } from "../utils/authMiddleware";

const router = Router();

// Retrieve current user's hospital details (must come before parametric route)
router.get("/current", authMiddleware, getCurrentHospital);

// Retrieve details of a specific hospital by hospitalId
router.get("/:hospitalId", authMiddleware, getHospitalById);

export default router;
