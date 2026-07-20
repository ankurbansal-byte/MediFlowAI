import mongoose from "mongoose";

export type UserRole = "doctor" | "patient";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["doctor", "patient"],
    },
    patientId: {
      type: String,
      required: false,
      default: null,
    },
    // New Profile Fields
    fullName: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    dob: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      required: false,
      enum: ["Male", "Female", "Other", ""],
    },
    // New Doctor-Specific Fields
    medicalRegistrationNumber: {
      type: String,
      required: false,
      trim: true,
    },
    hospitalClinicName: {
      type: String,
      required: false,
      trim: true,
    },
    specialization: {
      type: String,
      required: false,
      trim: true,
    },
    // Security and Flow Fields
    isEmailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      required: false,
    },
    emailVerificationTokenExpires: {
      type: Date,
      required: false,
    },
    passwordResetToken: {
      type: String,
      required: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      required: false,
    },
    refreshTokens: {
      type: [String],
      required: false,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
