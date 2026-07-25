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
  } catch (error: any) {
    const hasAuthHeader = !!authHeader;
    let decoded: any = null;
    try {
      decoded = jwt.decode(token);
    } catch (e) {
      // ignore decode error
    }

    const method = req.method;
    const path = req.originalUrl || req.url;
    const nowISO = new Date().toISOString();

    if (error instanceof jwt.TokenExpiredError || (error && error.name === "TokenExpiredError")) {
      const expTime = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : "unknown";
      const iatTime = decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : "unknown";
      console.warn(`AUTH_REJECTED expired_token ${method} ${path} exp=${expTime} now=${nowISO} iat=${iatTime} hasAuthHeader=${hasAuthHeader}`);
    } else {
      const expTime = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : "unknown";
      console.warn(`AUTH_REJECTED invalid_token ${method} ${path} exp=${expTime} now=${nowISO} hasAuthHeader=${hasAuthHeader} error=${error?.message || error}`);
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};
