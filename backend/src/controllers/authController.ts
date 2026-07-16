import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { MOCK_USERS } from "../utils/mockUsers";

const JWT_SECRET = process.env.JWT_SECRET || "mediflow_secret_key_change_me_in_production";

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  // Handle Mock Fallback mode
  if (process.env.USE_MOCK_DATA === "true") {
    const mockUser = MOCK_USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!mockUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isMatch = bcrypt.compareSync(password, mockUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      {
        username: mockUser.username,
        role: mockUser.role,
        patientId: mockUser.patientId,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        username: mockUser.username,
        role: mockUser.role,
        patientId: mockUser.patientId,
      },
    });
  }

  // Handle Database mode
  try {
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        patientId: user.patientId,
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
