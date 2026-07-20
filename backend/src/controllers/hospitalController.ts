import { Response } from "express";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import Hospital from "../models/Hospital";
import User from "../models/User";
import { dynamicMockUsers } from "./authController";
import { dynamicMockHospitals } from "../utils/mockHospitals";

/**
 * GET /api/hospital/current
 * Returns the hospital details of the currently logged-in user.
 */
export const getCurrentHospital = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { username } = req.user;

  // Mock Fallback Mode
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find((u) => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.hospitalId) {
      return res.status(404).json({
        success: false,
        message: "User is not associated with any hospital.",
      });
    }

    const hospital = dynamicMockHospitals.find((h) => h.hospitalId === user.hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    return res.status(200).json({ success: true, hospital });
  }

  // Database Mode
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.hospitalId) {
      return res.status(404).json({
        success: false,
        message: "User is not associated with any hospital.",
      });
    }

    const hospital = await Hospital.findOne({ hospitalId: user.hospitalId });
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    return res.status(200).json({ success: true, hospital });
  } catch (error) {
    console.error("Error fetching current hospital:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching current hospital.",
    });
  }
};

/**
 * GET /api/hospital/:hospitalId
 * Returns the details of a hospital specified by hospitalId.
 */
export const getHospitalById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { hospitalId } = req.params;

  if (!hospitalId) {
    return res.status(400).json({ success: false, message: "Hospital ID is required." });
  }

  // Mock Fallback Mode
  if (process.env.USE_MOCK_DATA === "true") {
    const hospital = dynamicMockHospitals.find((h) => h.hospitalId === hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }
    return res.status(200).json({ success: true, hospital });
  }

  // Database Mode
  try {
    const hospital = await Hospital.findOne({ hospitalId });
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }
    return res.status(200).json({ success: true, hospital });
  } catch (error) {
    console.error("Error fetching hospital by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching hospital by ID.",
    });
  }
};
