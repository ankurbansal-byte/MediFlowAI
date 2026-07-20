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
} from "../controllers/authController";

const router = Router();

router.post("/register/patient", registerPatient);
router.post("/register/doctor", registerDoctor);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);

export default router;
