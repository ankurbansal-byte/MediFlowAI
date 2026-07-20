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
 * PUT /api/hospital/current
 * Updates the hospital details of the currently logged-in user.
 */
export const updateCurrentHospital = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { username } = req.user;
  const {
    hospitalName,
    address,
    city,
    state,
    country,
    pincode,
    phone,
    email,
    website,
    logo,
    status,
  } = req.body;

  // Basic validation
  if (!hospitalName || !address || !city || !state || !country || !pincode || !phone || !email) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing: hospitalName, address, city, state, country, pincode, phone, email.",
    });
  }

  // Mock Fallback Mode
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find((u) => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.hospitalId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with any hospital.",
      });
    }

    const hospital = dynamicMockHospitals.find((h) => h.hospitalId === user.hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    // Update details
    hospital.hospitalName = hospitalName;
    hospital.address = address;
    hospital.city = city;
    hospital.state = state;
    hospital.country = country;
    hospital.pincode = pincode;
    hospital.phone = phone;
    hospital.email = email;
    hospital.website = website;
    hospital.logo = logo;
    if (status) {
      hospital.status = status;
    }
    hospital.updatedAt = new Date();

    return res.status(200).json({
      success: true,
      message: "Hospital profile updated successfully (mock).",
      hospital,
    });
  }

  // Database Mode
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.hospitalId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with any hospital.",
      });
    }

    const hospital = await Hospital.findOneAndUpdate(
      { hospitalId: user.hospitalId },
      {
        $set: {
          hospitalName,
          address,
          city,
          state,
          country,
          pincode,
          phone,
          email,
          website,
          logo,
          status: status || "active",
        },
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Hospital profile updated successfully.",
      hospital,
    });
  } catch (error) {
    console.error("Error updating current hospital:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating current hospital.",
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
