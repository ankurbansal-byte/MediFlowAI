import { Router } from "express";
import {
  registerPatient,
  registerDoctor,
  login,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logout,
  getProfile,
  updateProfile,
} from "../controllers/authController";
import { authMiddleware } from "../utils/authMiddleware";

const router = Router();

router.post("/register/patient", registerPatient);
router.post("/register/doctor", registerDoctor);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
