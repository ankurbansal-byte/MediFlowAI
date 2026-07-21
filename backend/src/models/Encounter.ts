import mongoose from "mongoose";

const encounterSchema = new mongoose.Schema(
  {
    encounterId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hospitalId: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
    },
    visitDate: {
      type: Date,
      required: true,
    },
    visitType: {
      type: String,
      required: true,
      trim: true,
    },
    chiefComplaint: {
      type: String,
      required: false,
      default: "",
    },
    symptoms: {
      type: String,
      required: false,
      default: "",
    },
    provisionalDiagnosis: {
      type: String,
      required: false,
      default: "",
    },
    doctorNotes: {
      type: String,
      required: false,
      default: "",
    },
    followUpDate: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Encounter", encounterSchema);
