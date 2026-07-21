import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import { MOCK_USERS, dynamicMockUsers } from "../utils/mockUsers";
import { mailService } from "../services/mailService";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import {
  validatePatientRegistration,
  validateDoctorRegistration,
  isStrongPassword,
} from "../utils/validators";

const JWT_SECRET = process.env.JWT_SECRET || "mediflow_secret_key_change_me_in_production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "mediflow_refresh_key_change_me_in_production";

/**
 * Utility to calculate next available Patient ID
 */
const getNextPatientId = async (): Promise<string> => {
  let maxId = 106; // Standard seeded users go PAT-101 to PAT-106

  if (process.env.USE_MOCK_DATA === "true") {
    for (const u of dynamicMockUsers) {
      if (u.role === "patient" && u.patientId && u.patientId.startsWith("PAT-")) {
        const num = parseInt(u.patientId.substring(4), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  } else {
    try {
      const users = await User.find({ role: "patient", patientId: { $ne: null } });
      for (const u of users) {
        if (u.patientId && u.patientId.startsWith("PAT-")) {
          const num = parseInt(u.patientId.substring(4), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    } catch (e) {
      console.error("Error finding max patientId in DB:", e);
    }
  }

  return `PAT-${maxId + 1}`;
};

/**
 * Endpoint: Patient Registration
 */
export const registerPatient = async (req: Request, res: Response) => {
  const errors = validatePatientRegistration(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const { fullName, email, mobileNumber, dob, gender, password } = req.body;
  const patientId = await getNextPatientId();
  const username = patientId; // Patient login credential

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // MOCK PERSISTENCE
  if (process.env.USE_MOCK_DATA === "true") {
    // Check email unique in mock
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({
        success: false,
        errors: ["An account with this email address already exists."],
      });
    }

    const newMockUser = {
      username,
      passwordHash,
      role: "patient" as const,
      patientId,
      hospitalId: req.body.hospitalId || "HOSP-001",
      fullName,
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      dob,
      gender,
      isEmailVerified: false,
      status: "active",
      refreshTokens: [],
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationExpires,
      passwordResetToken: undefined,
      passwordResetTokenExpires: undefined,
      medicalRegistrationNumber: undefined,
      hospitalClinicName: undefined,
      specialization: undefined,
      mustChangePassword: false,
    };

    dynamicMockUsers.push(newMockUser);

    // Send verification mail
    await mailService.sendVerificationEmail(newMockUser.email, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully. A verification link has been sent to your email.",
      patientId,
      emailVerificationToken: verificationToken, // sent in JSON for easy test verification
    });
  }

  // DB PERSISTENCE
  try {
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email: { $regex: new RegExp(`^${email.trim()}$`, "i") } },
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        errors: ["An account with this email address or Patient ID already exists."],
      });
    }

    const newUser = await User.create({
      username,
      password: passwordHash,
      role: "patient",
      patientId,
      hospitalId: req.body.hospitalId || null,
      fullName,
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      dob,
      gender,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationExpires,
    });

    await mailService.sendVerificationEmail(newUser.email!, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully. A verification link has been sent to your email.",
      patientId,
      emailVerificationToken: verificationToken,
    });
  } catch (error) {
    console.error("Patient registration error:", error);
    return res.status(500).json({
      success: false,
      errors: ["Server error during patient registration."],
    });
  }
};

/**
 * Endpoint: Get Profile Info
 */
export const getProfile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { username } = authReq.user;

  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find((u) => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.status(200).json({
      success: true,
      profile: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        doctorId: (user as any).doctorId || null,
        hospitalId: (user as any).hospitalId || null,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        dob: user.dob,
        gender: user.gender,
        hospitalClinicName: user.hospitalClinicName,
        specialization: user.specialization,
        yearsOfExperience: (user as any).yearsOfExperience || "",
        address: (user as any).address || "",
        emergencyContact: (user as any).emergencyContact || "",
      },
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.status(200).json({
      success: true,
      profile: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        doctorId: (user as any).doctorId || null,
        hospitalId: user.hospitalId || null,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        dob: user.dob,
        gender: user.gender,
        hospitalClinicName: user.hospitalClinicName,
        specialization: user.specialization,
        yearsOfExperience: (user as any).yearsOfExperience || "",
        address: (user as any).address || "",
        emergencyContact: (user as any).emergencyContact || "",
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: "Server error fetching profile." });
  }
};

/**
 * Endpoint: Update Profile Info
 */
export const updateProfile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const { username, role } = authReq.user;
  const {
    fullName,
    email,
    mobileNumber,
    dob,
    gender,
    address,
    emergencyContact,
    hospitalClinicName,
    specialization,
    yearsOfExperience,
    oldPassword,
    newPassword,
  } = req.body;

  // 1. Password change validation if requested
  let newPasswordHash: string | undefined = undefined;

  if (oldPassword || newPassword) {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current password and new password are required to change password.",
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
      });
    }

    // Verify current password
    if (process.env.USE_MOCK_DATA === "true") {
      const user = dynamicMockUsers.find((u) => u.username === username);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      const isMatch = bcrypt.compareSync(oldPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Current password is incorrect." });
      }
      const salt = bcrypt.genSaltSync(10);
      newPasswordHash = bcrypt.hashSync(newPassword, salt);
    } else {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(404).json({ success: false, message: "User not found." });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }
        const salt = bcrypt.genSaltSync(10);
        newPasswordHash = bcrypt.hashSync(newPassword, salt);
      } catch (err) {
        console.error("Password update error:", err);
        return res.status(500).json({ success: false, message: "Server error verifying password." });
      }
    }
  }

  // 2. Perform updates
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find((u) => u.username === username);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check unique email if email was updated
    if (email && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const emailExists = dynamicMockUsers.some(
        (u) => u.username !== username && u.email && u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (emailExists) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }
    }

    user.fullName = fullName !== undefined ? fullName : user.fullName;
    user.email = email !== undefined ? email.trim().toLowerCase() : user.email;
    user.mobileNumber = mobileNumber !== undefined ? mobileNumber : user.mobileNumber;

    if (role === "patient") {
      user.dob = dob !== undefined ? dob : user.dob;
      user.gender = gender !== undefined ? gender : user.gender;
      (user as any).address = address !== undefined ? address : (user as any).address;
      (user as any).emergencyContact = emergencyContact !== undefined ? emergencyContact : (user as any).emergencyContact;
    } else if (role === "doctor") {
      user.hospitalClinicName = hospitalClinicName !== undefined ? hospitalClinicName : user.hospitalClinicName;
      user.specialization = specialization !== undefined ? specialization : user.specialization;
      (user as any).yearsOfExperience = yearsOfExperience !== undefined ? yearsOfExperience : (user as any).yearsOfExperience;
    }

    if (newPasswordHash) {
      user.passwordHash = newPasswordHash;
      user.refreshTokens = []; // Revoke active sessions for security
      (user as any).mustChangePassword = false;
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        isEmailVerified: user.isEmailVerified,
        email: user.email,
        fullName: user.fullName,
        mustChangePassword: (user as any).mustChangePassword || false,
      },
    });
  }

  // DB UPDATE
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check unique email if email was updated
    if (email && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const emailExists = await User.findOne({
        username: { $ne: username },
        email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
      });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }
    }

    const updates: any = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber;

    if (role === "patient") {
      if (dob !== undefined) updates.dob = dob;
      if (gender !== undefined) updates.gender = gender;
      if (address !== undefined) updates.address = address;
      if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
    } else if (role === "doctor") {
      if (hospitalClinicName !== undefined) updates.hospitalClinicName = hospitalClinicName;
      if (specialization !== undefined) updates.specialization = specialization;
      if (yearsOfExperience !== undefined) updates.yearsOfExperience = yearsOfExperience;
    }

    if (newPasswordHash) {
      updates.password = newPasswordHash;
      updates.refreshTokens = []; // Revoke active sessions for security
      updates.mustChangePassword = false;
    }

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User update failed." });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        username: updatedUser.username,
        role: updatedUser.role,
        patientId: updatedUser.patientId,
        isEmailVerified: updatedUser.isEmailVerified,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, message: "Server error during profile update." });
  }
};

/**
 * Endpoint: Doctor Registration
 */
export const registerDoctor = async (req: Request, res: Response) => {
  const errors = validateDoctorRegistration(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const {
    fullName,
    email,
    mobileNumber,
    hospitalClinicName,
    specialization,
    password,
  } = req.body;

  const username = email.trim().toLowerCase(); // Doctors login with email as username
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // MOCK PERSISTENCE
  if (process.env.USE_MOCK_DATA === "true") {
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({
        success: false,
        errors: ["An account with this email address already exists."],
      });
    }

    const newMockUser = {
      username,
      passwordHash,
      role: "doctor" as const,
      patientId: undefined,
      hospitalId: req.body.hospitalId || "HOSP-001",
      fullName,
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      dob: undefined,
      gender: undefined,
      isEmailVerified: false,
      status: "active",
      refreshTokens: [],
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationExpires,
      passwordResetToken: undefined,
      passwordResetTokenExpires: undefined,
      medicalRegistrationNumber: undefined,
      hospitalClinicName,
      specialization,
      mustChangePassword: false,
    };

    dynamicMockUsers.push(newMockUser);

    await mailService.sendVerificationEmail(newMockUser.email, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully. A verification link has been sent to your email.",
      emailVerificationToken: verificationToken,
    });
  }

  // DB PERSISTENCE
  try {
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email: { $regex: new RegExp(`^${email.trim()}$`, "i") } },
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        errors: ["An account with this email address already exists."],
      });
    }

    const newUser = await User.create({
      username,
      password: passwordHash,
      role: "doctor",
      patientId: null,
      hospitalId: req.body.hospitalId || null,
      fullName,
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      medicalRegistrationNumber: undefined,
      hospitalClinicName,
      specialization,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationExpires,
    });

    await mailService.sendVerificationEmail(newUser.email!, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully. A verification link has been sent to your email.",
      emailVerificationToken: verificationToken,
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    return res.status(500).json({
      success: false,
      errors: ["Server error during doctor registration."],
    });
  }
};

/**
 * Endpoint: Secure Login (Username, Email or Patient ID)
 */
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username, email, or Patient ID, and password are required.",
    });
  }

  const cleanQuery = username.trim().toLowerCase();

  // MOCK LOGIN FLOW
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find(
      (u) =>
        u.username.toLowerCase() === cleanQuery ||
        (u.email && u.email.toLowerCase() === cleanQuery) ||
        (u.patientId && u.patientId.toLowerCase() === cleanQuery) ||
        ((u as any).doctorId && (u as any).doctorId.toLowerCase() === cleanQuery)
    );

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ success: false, message: "Account is inactive or deactivated. Access denied." });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role, patientId: user.patientId, doctorId: (user as any).doctorId },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshTokens.push(refreshToken);

    console.log("=========================================");
    console.log("Mock login user object in authController:", user);
    console.log("=========================================");

    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        doctorId: (user as any).doctorId,
        isEmailVerified: user.isEmailVerified,
        email: user.email,
        fullName: user.fullName,
        mustChangePassword: (user as any).mustChangePassword || false,
      },
    });
  }

  // DB LOGIN FLOW
  try {
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${cleanQuery}$`, "i") } },
        { email: { $regex: new RegExp(`^${cleanQuery}$`, "i") } },
        { patientId: { $regex: new RegExp(`^${cleanQuery}$`, "i") } },
        { doctorId: { $regex: new RegExp(`^${cleanQuery}$`, "i") } },
      ],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ success: false, message: "Account is inactive or deactivated. Access denied." });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role, patientId: user.patientId, doctorId: (user as any).doctorId },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Save refresh token
    const refreshTokens = user.refreshTokens || [];
    refreshTokens.push(refreshToken);
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens } });

    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
        doctorId: (user as any).doctorId,
        isEmailVerified: user.isEmailVerified,
        email: user.email,
        fullName: user.fullName,
        mustChangePassword: (user as any).mustChangePassword || false,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
};

/**
 * Endpoint: Refresh Token Rotation
 */
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token is required." });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { username: string };

    // MOCK FLOW
    if (process.env.USE_MOCK_DATA === "true") {
      const user = dynamicMockUsers.find((u) => u.username === decoded.username);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return res.status(401).json({ success: false, message: "Invalid or revoked refresh token." });
      }

      if (user.status === "inactive") {
        return res.status(403).json({ success: false, message: "Account is inactive or deactivated. Access denied." });
      }

      // Rotate Refresh Token
      user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);

      const newToken = jwt.sign(
        { username: user.username, role: user.role, patientId: user.patientId, doctorId: (user as any).doctorId },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      const newRefreshToken = jwt.sign(
        { username: user.username },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      user.refreshTokens.push(newRefreshToken);

      return res.status(200).json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
      });
    }

    // DB FLOW
    const user = await User.findOne({ username: decoded.username });
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, message: "Invalid or revoked refresh token." });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ success: false, message: "Account is inactive or deactivated. Access denied." });
    }

    // Rotate Refresh Token
    const refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);

    const newToken = jwt.sign(
      { username: user.username, role: user.role, patientId: user.patientId, doctorId: (user as any).doctorId },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const newRefreshToken = jwt.sign(
      { username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    refreshTokens.push(newRefreshToken);
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens } });

    return res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
  }
};

/**
 * Endpoint: Email Verification
 */
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "Verification token is required." });
  }

  // MOCK FLOW
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find(
      (u) =>
        u.emailVerificationToken === token &&
        u.emailVerificationTokenExpires &&
        u.emailVerificationTokenExpires.getTime() > Date.now()
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired email verification token.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now access all clinical features.",
    });
  }

  // DB FLOW
  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired email verification token.",
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now access all clinical features.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during email verification.",
    });
  }
};

/**
 * Endpoint: Forgot Password (Request Link)
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // MOCK FLOW
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find((u) => u.email && u.email.toLowerCase() === cleanEmail);

    if (user) {
      user.passwordResetToken = resetToken;
      user.passwordResetTokenExpires = resetExpires;
      await mailService.sendResetPasswordEmail(user.email, resetToken);
    }

    // Always return success for security (prevent email enumeration), but return reset token for verification
    return res.status(200).json({
      success: true,
      message: "If that email exists in our system, we have sent a reset link.",
      passwordResetToken: user ? resetToken : undefined, // sent in body for testing ease
    });
  }

  // DB FLOW
  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });

    if (user) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: resetToken,
            passwordResetTokenExpires: resetExpires,
          },
        }
      );
      await mailService.sendResetPasswordEmail(user.email!, resetToken);
    }

    return res.status(200).json({
      success: true,
      message: "If that email exists in our system, we have sent a reset link.",
      passwordResetToken: user ? resetToken : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during forgot password processing.",
    });
  }
};

/**
 * Endpoint: Reset Password (Confirm Password Change)
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: "Reset token and new password are required.",
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Password and Confirm Password do not match.",
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // MOCK FLOW
  if (process.env.USE_MOCK_DATA === "true") {
    const user = dynamicMockUsers.find(
      (u) =>
        u.passwordResetToken === token &&
        u.passwordResetTokenExpires &&
        u.passwordResetTokenExpires.getTime() > Date.now()
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.refreshTokens = []; // Revoke sessions

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. Please log in with your new credentials.",
    });
  }

  // DB FLOW
  try {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: passwordHash,
          passwordResetToken: null,
          passwordResetTokenExpires: null,
          refreshTokens: [], // Revoke active sessions
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. Please log in with your new credentials.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during password reset.",
    });
  }
};

/**
 * Endpoint: Secure Logout (Revoke Refresh Token)
 */
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token is required." });
  }

  // MOCK FLOW
  if (process.env.USE_MOCK_DATA === "true") {
    for (const u of dynamicMockUsers) {
      if (u.refreshTokens.includes(refreshToken)) {
        u.refreshTokens = u.refreshTokens.filter((t: string) => t !== refreshToken);
        break;
      }
    }
    return res.status(200).json({ success: true, message: "Logged out successfully (mock mode)." });
  }

  // DB FLOW
  try {
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (user) {
      const refreshTokens = (user.refreshTokens || []).filter((t: string) => t !== refreshToken);
      await User.updateOne({ _id: user._id }, { $set: { refreshTokens } });
    }
    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during logout.",
    });
  }
};
