import { Router } from "express";
import { getCurrentHospital, getHospitalById, updateCurrentHospital } from "../controllers/hospitalController";
import { authMiddleware } from "../utils/authMiddleware";

const router = Router();

// Retrieve current user's hospital details (must come before parametric route)
router.get("/current", authMiddleware, getCurrentHospital);

// Update current user's hospital details
router.put("/current", authMiddleware, updateCurrentHospital);

// Retrieve details of a specific hospital by hospitalId
router.get("/:hospitalId", authMiddleware, getHospitalById);

export default router;
