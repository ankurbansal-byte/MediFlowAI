import mongoose from "mongoose";

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },

    parameter: {
      type: String,
      required: true,
    },

    value: {
  type: mongoose.Schema.Types.Mixed,
  required: true,
},

    unit: {
      type: String,
      default: "",
    },

    recordedAt: {
      type: Date,
      default: Date.now,
    },

    source: {
      type: String,
      default: "text",
    },

    confidence: {
      type: Number,
      default: 0.99,
    },

    originalMessage: {
  type: String,
  default: "",
},

whatsappMessageId: {
  type: String,
  required: true,
  unique: true,
},

    encounterId: {
      type: String,
      required: false,
    },

    hospitalId: {
      type: String,
      required: false,
    },

    doctorId: {
      type: String,
      required: false,
    },

    recordedBy: {
      type: String,
      required: false,
    },

  },
  {
    timestamps: true,
  }
);

healthRecordSchema.index({ patientId: 1, recordedAt: -1 });
healthRecordSchema.index({ encounterId: 1 });

export default mongoose.model("HealthRecord", healthRecordSchema);
