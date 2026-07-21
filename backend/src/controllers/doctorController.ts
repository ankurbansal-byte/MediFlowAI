import { Response } from "express";
import { AuthenticatedRequest } from "../utils/authMiddleware";
import User from "../models/User";
import Hospital from "../models/Hospital";
import { dynamicMockUsers } from "../utils/mockUsers";
import { dynamicMockHospitals } from "../utils/mockHospitals";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Helper: check if a Hospital Admin has access to a specific doctor.
 * The Admin must belong to the same hospital as the Doctor.
 */
export const canAccessDoctor = async (reqUser: any, doctorId: string): Promise<boolean> => {
  if (!reqUser) return false;

  // Get requesting user's hospitalId
  let reqUserHospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.username === reqUser.username);
    if (matched) {
      reqUserHospitalId = matched.hospitalId;
    }
  } else {
    try {
      const matched = await User.findOne({ username: reqUser.username });
      if (matched) {
        reqUserHospitalId = matched.hospitalId || "";
      }
    } catch (e) {
      console.error("Error fetching request user for access control:", e);
    }
  }

  if (!reqUserHospitalId) return false;

  // Get target doctor's hospitalId
  let targetHospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const matched = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    if (matched) {
      targetHospitalId = matched.hospitalId;
    }
  } else {
    try {
      const matched = await User.findOne({ doctorId, role: "doctor" });
      if (matched) {
        targetHospitalId = matched.hospitalId || "";
      }
    } catch (e) {
      console.error("Error fetching target doctor for access control:", e);
    }
  }

  return reqUserHospitalId === targetHospitalId;
};

/**
 * Helper: Generate unique doctorId continuing the DOC-XXX sequence.
 */
const getNextDoctorIdForAdmin = async (): Promise<string> => {
  let maxId = 101; // Standard seeded doctor is DOC-101

  if (process.env.USE_MOCK_DATA === "true") {
    for (const u of dynamicMockUsers) {
      if (u.role === "doctor" && u.doctorId && u.doctorId.startsWith("DOC-")) {
        const num = parseInt(u.doctorId.substring(4), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  } else {
    try {
      const users = await User.find({ role: "doctor", doctorId: { $ne: null } });
      for (const u of users) {
        if (u.doctorId && u.doctorId.startsWith("DOC-")) {
          const num = parseInt(u.doctorId.substring(4), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    } catch (e) {
      console.error("Error finding max doctorId in DB:", e);
    }
  }

  return `DOC-${maxId + 1}`;
};

/**
 * POST /api/doctor/admin/create
 * Creates/enrolls a new doctor by the Hospital Admin.
 */
export const createDoctorByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const {
    fullName,
    email,
    mobileNumber,
    gender,
    department,
    specialization,
    qualification,
    medicalRegistrationNumber,
    yearsOfExperience,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !mobileNumber ||
    !gender ||
    !department ||
    !specialization ||
    !qualification ||
    !medicalRegistrationNumber ||
    !yearsOfExperience
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required: fullName, email, mobileNumber, gender, department, specialization, qualification, medicalRegistrationNumber, yearsOfExperience.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check unique email
  if (process.env.USE_MOCK_DATA === "true") {
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }
  } else {
    try {
      const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error checking email uniqueness." });
    }
  }

  // Get Admin's hospitalId
  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  const doctorId = await getNextDoctorIdForAdmin();
  const tempPassword = `Temp!${crypto.randomBytes(3).toString("hex")}`;
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  if (process.env.USE_MOCK_DATA === "true") {
    const newMockDoctor = {
      username: doctorId,
      passwordHash,
      role: "doctor" as const,
      doctorId,
      hospitalId,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobileNumber: mobileNumber.trim(),
      dob: undefined,
      gender,
      department: department.trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      medicalRegistrationNumber: medicalRegistrationNumber.trim(),
      yearsOfExperience: String(yearsOfExperience).trim(),
      isEmailVerified: true,
      status: "active",
      mustChangePassword: true,
      refreshTokens: [] as string[],
    };
    dynamicMockUsers.push(newMockDoctor);

    return res.status(201).json({
      success: true,
      message: "Doctor enrolled successfully.",
      doctor: {
        doctorId,
        username: doctorId,
        fullName: newMockDoctor.fullName,
        email: newMockDoctor.email,
        mobileNumber: newMockDoctor.mobileNumber,
        gender: newMockDoctor.gender,
        hospitalId: newMockDoctor.hospitalId,
      },
      temporaryPassword: tempPassword,
    });
  }

  try {
    const newDoctorUser = await User.create({
      username: doctorId,
      password: passwordHash,
      role: "doctor",
      doctorId,
      hospitalId,
      fullName: fullName.trim(),
      email: cleanEmail,
      mobileNumber: mobileNumber.trim(),
      gender,
      department: department.trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      medicalRegistrationNumber: medicalRegistrationNumber.trim(),
      yearsOfExperience: String(yearsOfExperience).trim(),
      isEmailVerified: true,
      mustChangePassword: true,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Doctor enrolled successfully.",
      doctor: {
        doctorId,
        username: doctorId,
        fullName: newDoctorUser.fullName,
        email: newDoctorUser.email,
        mobileNumber: newDoctorUser.mobileNumber,
        gender: newDoctorUser.gender,
        hospitalId: newDoctorUser.hospitalId,
      },
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error("Enroll doctor error:", error);
    return res.status(500).json({ success: false, message: "Failed to enroll doctor." });
  }
};

/**
 * GET /api/doctor/admin/list
 * Lists all doctors in the admin's hospital.
 */
export const listDoctorsByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const hospitalDoctors = dynamicMockUsers.filter(
      (u) => u.role === "doctor" && u.hospitalId === hospitalId
    );
    return res.status(200).json({
      success: true,
      doctors: hospitalDoctors.map((u) => ({
        doctorId: u.doctorId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        gender: u.gender,
        department: u.department,
        specialization: u.specialization,
        qualification: u.qualification,
        medicalRegistrationNumber: u.medicalRegistrationNumber,
        yearsOfExperience: u.yearsOfExperience,
        hospitalId: u.hospitalId,
        status: u.status || "active",
        createdAt: (u as any).createdAt || new Date().toISOString(),
      })),
    });
  }

  try {
    const hospitalDoctors = await User.find({
      role: "doctor",
      hospitalId,
    }).select("-password -refreshTokens");

    return res.status(200).json({
      success: true,
      doctors: hospitalDoctors,
    });
  } catch (error) {
    console.error("List doctors error:", error);
    return res.status(500).json({ success: false, message: "Failed to list doctors." });
  }
};

/**
 * GET /api/doctor/admin/search
 * Searches doctors in the admin's hospital.
 */
export const searchDoctorsByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const query = String(req.query.q || "").trim().toLowerCase();

  let hospitalId = "";
  if (process.env.USE_MOCK_DATA === "true") {
    const adminUser = dynamicMockUsers.find((u: any) => u.username === req.user?.username);
    if (adminUser && adminUser.hospitalId) {
      hospitalId = adminUser.hospitalId;
    }
  } else {
    try {
      const adminUser = await User.findOne({ username: req.user.username });
      if (adminUser && adminUser.hospitalId) {
        hospitalId = adminUser.hospitalId;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!hospitalId) {
    return res.status(403).json({ success: false, message: "Forbidden. Admin is not associated with any hospital." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const hospitalDoctors = dynamicMockUsers.filter(
      (u) => u.role === "doctor" && u.hospitalId === hospitalId
    );

    const filtered = hospitalDoctors.filter((u) => {
      if (!query) return true;
      const matchName = String(u.fullName || "").toLowerCase().includes(query);
      const matchEmail = String(u.email || "").toLowerCase().includes(query);
      const matchId = String(u.doctorId || "").toLowerCase().includes(query);
      const matchSpec = String(u.specialization || "").toLowerCase().includes(query);
      const matchDept = String(u.department || "").toLowerCase().includes(query);
      return matchName || matchEmail || matchId || matchSpec || matchDept;
    });

    return res.status(200).json({
      success: true,
      doctors: filtered.map((u) => ({
        doctorId: u.doctorId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        mobileNumber: u.mobileNumber,
        gender: u.gender,
        department: u.department,
        specialization: u.specialization,
        qualification: u.qualification,
        medicalRegistrationNumber: u.medicalRegistrationNumber,
        yearsOfExperience: u.yearsOfExperience,
        hospitalId: u.hospitalId,
        status: u.status || "active",
        createdAt: (u as any).createdAt || new Date().toISOString(),
      })),
    });
  }

  try {
    const queryCond: any = {
      role: "doctor",
      hospitalId,
    };

    if (query) {
      queryCond.$or = [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { doctorId: { $regex: query, $options: "i" } },
        { specialization: { $regex: query, $options: "i" } },
        { department: { $regex: query, $options: "i" } },
      ];
    }

    const matchedDoctors = await User.find(queryCond).select("-password -refreshTokens");

    return res.status(200).json({
      success: true,
      doctors: matchedDoctors,
    });
  } catch (error) {
    console.error("Search doctors error:", error);
    return res.status(500).json({ success: false, message: "Failed to search doctors." });
  }
};

/**
 * GET /api/doctor/admin/detail/:doctorId
 * Returns the full details of a doctor, including the hospital name.
 */
export const getDoctorDetailByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const doctorId = req.params.doctorId as string;
  const isAllowed = await canAccessDoctor(req.user, doctorId);
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: "Forbidden. Doctor does not belong to your hospital." });
  }

  let doctor: any = null;
  if (process.env.USE_MOCK_DATA === "true") {
    const found = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    if (found) {
      doctor = {
        doctorId: found.doctorId,
        username: found.username,
        fullName: found.fullName,
        email: found.email,
        mobileNumber: found.mobileNumber,
        gender: found.gender,
        hospitalId: found.hospitalId,
        department: found.department,
        specialization: found.specialization,
        qualification: found.qualification,
        medicalRegistrationNumber: found.medicalRegistrationNumber,
        yearsOfExperience: found.yearsOfExperience,
        status: found.status || "active",
        createdAt: (found as any).createdAt || new Date().toISOString(),
      };
    }
  } else {
    try {
      const found = await User.findOne({ doctorId, role: "doctor" }).select("-password -refreshTokens");
      if (found) {
        doctor = found;
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Error fetching doctor details." });
    }
  }

  if (!doctor) {
    return res.status(404).json({ success: false, message: "Doctor not found." });
  }

  // Fetch hospital name
  let hospitalName = "";
  if (doctor.hospitalId) {
    if (process.env.USE_MOCK_DATA === "true") {
      const h = dynamicMockHospitals.find((h) => h.hospitalId === doctor.hospitalId);
      hospitalName = h ? h.hospitalName : "MediFlow Hospital";
    } else {
      try {
        const h = await Hospital.findOne({ hospitalId: doctor.hospitalId });
        hospitalName = h ? h.hospitalName : "";
      } catch (err) {
        console.error(err);
      }
    }
  }

  return res.status(200).json({
    success: true,
    doctor,
    hospitalName,
  });
};

/**
 * PUT /api/doctor/admin/update/:doctorId
 * Updates demographic/professional details and account status for a doctor.
 */
export const updateDoctorDetailByAdmin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
  }

  const doctorId = req.params.doctorId as string;
  const isAllowed = await canAccessDoctor(req.user, doctorId);
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: "Forbidden. Doctor does not belong to your hospital." });
  }

  const {
    fullName,
    email,
    mobileNumber,
    gender,
    department,
    specialization,
    qualification,
    medicalRegistrationNumber,
    yearsOfExperience,
    status,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !mobileNumber ||
    !gender ||
    !department ||
    !specialization ||
    !qualification ||
    !medicalRegistrationNumber ||
    !yearsOfExperience ||
    !status
  ) {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing: fullName, email, mobileNumber, gender, department, specialization, qualification, medicalRegistrationNumber, yearsOfExperience, status.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check unique email
  if (process.env.USE_MOCK_DATA === "true") {
    const emailExists = dynamicMockUsers.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail && u.doctorId !== doctorId
    );
    if (emailExists) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }

    const doctor = dynamicMockUsers.find((u) => u.doctorId === doctorId && u.role === "doctor");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    doctor.fullName = fullName.trim();
    doctor.email = cleanEmail;
    doctor.mobileNumber = mobileNumber.trim();
    doctor.gender = gender;
    doctor.department = department.trim();
    doctor.specialization = specialization.trim();
    doctor.qualification = qualification.trim();
    doctor.medicalRegistrationNumber = medicalRegistrationNumber.trim();
    doctor.yearsOfExperience = String(yearsOfExperience).trim();
    doctor.status = status;

    return res.status(200).json({
      success: true,
      message: "Doctor details updated successfully.",
      doctor,
    });
  } else {
    try {
      const existingUser = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
        doctorId: { $ne: doctorId },
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }

      const updated = await User.findOneAndUpdate(
        { doctorId, role: "doctor" },
        {
          $set: {
            fullName: fullName.trim(),
            email: cleanEmail,
            mobileNumber: mobileNumber.trim(),
            gender,
            department: department.trim(),
            specialization: specialization.trim(),
            qualification: qualification.trim(),
            medicalRegistrationNumber: medicalRegistrationNumber.trim(),
            yearsOfExperience: String(yearsOfExperience).trim(),
            status,
          },
        },
        { new: true }
      ).select("-password -refreshTokens");

      if (!updated) {
        return res.status(404).json({ success: false, message: "Doctor not found." });
      }

      return res.status(200).json({
        success: true,
        message: "Doctor details updated successfully.",
        doctor: updated,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Failed to update doctor details." });
    }
  }
};
