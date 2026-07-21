import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { dynamicMockUsers } from "./mockUsers";

const JWT_SECRET = process.env.JWT_SECRET || "mediflow_secret_key_change_me_in_production";

export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    role: "doctor" | "patient" | "admin";
    patientId?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token required. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      username: string;
      role: "doctor" | "patient";
      patientId?: string;
    };

    // Verify user is active/not deactivated
    let userStatus = "active";
    if (process.env.USE_MOCK_DATA === "true") {
      const matched = dynamicMockUsers.find((u) => u.username === decoded.username);
      if (matched) {
        userStatus = matched.status || "active";
      }
    } else {
      const matched = await User.findOne({ username: decoded.username });
      if (matched) {
        userStatus = matched.status || "active";
      }
    }

    if (userStatus === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or deactivated. Access denied.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};
