import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    assignedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compounded index to help lookup and enforce uniqueness of active doctor-patient pairs
assignmentSchema.index({ doctorId: 1, patientId: 1, status: 1 });

export default mongoose.model("Assignment", assignmentSchema);
