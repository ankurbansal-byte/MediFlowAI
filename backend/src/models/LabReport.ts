import mongoose from "mongoose";

const labObservationSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    hospitalId: {
      type: String,
      required: false,
    },
    labReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabReport",
      required: false,
    },
    testName: {
      type: String,
      required: true,
    },
    canonicalTestKey: {
      type: String,
      required: false,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    unit: {
      type: String,
      default: "",
    },
    referenceRangeText: {
      type: String,
      default: "",
    },
    flag: {
      type: String,
      default: "",
    },
    specimenDate: {
      type: Date,
      required: false,
    },
    source: {
      type: String,
      enum: ["whatsapp_document", "whatsapp_image"],
      required: true,
    },
    whatsappMessageId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const labReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    hospitalId: {
      type: String,
      required: false,
    },
    whatsappMessageId: {
      type: String,
      required: true,
      unique: true,
    },
    mediaType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    reportDate: {
      type: Date,
      required: false,
    },
    laboratoryName: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["processing", "success", "failed"],
      default: "processing",
    },
    extractionMetadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

labObservationSchema.index({ patientId: 1, testName: 1 });
labReportSchema.index({ patientId: 1, whatsappMessageId: 1 });

export const LabObservation = mongoose.models.LabObservation || mongoose.model("LabObservation", labObservationSchema);
export const LabReport = mongoose.models.LabReport || mongoose.model("LabReport", labReportSchema);
