import { Response } from "express";
import HealthRecord from "../models/HealthRecord";
import { generateDemoRecords } from "../utils/demoData";
import { AuthenticatedRequest } from "../utils/authMiddleware";

type PatientDiscoveryResult = {
  patientId: string;
  latestRecordedAt: Date;
  totalRecords: number;
};

// ==============================
// Fallback Mock Data Definition
// ==============================
const demoRecords = generateDemoRecords();

// Group by patientId
const MOCK_RECORDS: Record<string, any[]> = {};
for (const r of demoRecords) {
  if (!MOCK_RECORDS[r.patientId]) {
    MOCK_RECORDS[r.patientId] = [];
  }
  MOCK_RECORDS[r.patientId].push({
    parameter: r.parameter,
    value: r.value,
    unit: r.unit,
    recordedAt: r.recordedAt,
    source: r.source,
    confidence: r.confidence,
    originalMessage: r.originalMessage,
    whatsappMessageId: r.whatsappMessageId
  });
}

// Generate patient discovery summary list sorted by latestRecordedAt descending
const MOCK_PATIENTS = Object.keys(MOCK_RECORDS).map((patientId) => {
  const records = MOCK_RECORDS[patientId];
  const latestRecord = records[records.length - 1];
  return {
    patientId,
    latestRecordedAt: latestRecord.recordedAt,
    totalRecords: records.length,
  };
}).sort((a, b) => b.latestRecordedAt.getTime() - a.latestRecordedAt.getTime());

// ==============================
// List Patients
// ==============================
export const getPatients = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  // If Patient, restrict to only their own PatientOption
  if (user.role === "patient") {
    const patientId = user.patientId;
    if (!patientId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    if (process.env.USE_MOCK_DATA === "true") {
      const records = MOCK_RECORDS[patientId] || [];
      const latestRecord = records[records.length - 1];
      const singlePatient = latestRecord ? [{
        patientId,
        latestRecordedAt: latestRecord.recordedAt,
        totalRecords: records.length,
      }] : [];

      return res.status(200).json({
        success: true,
        totalPatients: singlePatient.length,
        patients: singlePatient,
      });
    }

    try {
      const patients = await HealthRecord.aggregate<PatientDiscoveryResult>([
        { $match: { patientId } },
        {
          $group: {
            _id: "$patientId",
            latestRecordedAt: { $max: "$recordedAt" },
            totalRecords: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            patientId: "$_id",
            latestRecordedAt: 1,
            totalRecords: 1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        totalPatients: patients.length,
        patients,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch patients.",
      });
    }
  }

  // For Doctor (All patients)
  if (process.env.USE_MOCK_DATA === "true") {
    const dynamicMockPatients = Object.keys(MOCK_RECORDS).map((pId) => {
      const recs = MOCK_RECORDS[pId] || [];
      const latestRec = recs[recs.length - 1];
      return {
        patientId: pId,
        latestRecordedAt: latestRec ? latestRec.recordedAt : new Date(),
        totalRecords: recs.length,
      };
    }).sort((a, b) => new Date(b.latestRecordedAt).getTime() - new Date(a.latestRecordedAt).getTime());

    return res.status(200).json({
      success: true,
      totalPatients: dynamicMockPatients.length,
      patients: dynamicMockPatients,
    });
  }

  try {
    const patients = await HealthRecord.aggregate<PatientDiscoveryResult>([
      {
        $group: {
          _id: "$patientId",
          latestRecordedAt: { $max: "$recordedAt" },
          totalRecords: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          patientId: "$_id",
          latestRecordedAt: 1,
          totalRecords: 1,
        },
      },
      { $sort: { latestRecordedAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      totalPatients: patients.length,
      patients,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch patients.",
    });
  }
};

// ==============================
// Add New Health Record (For Patient Only)
// ==============================
export const addHealthRecord = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role !== "patient") {
    return res.status(403).json({ success: false, message: "Forbidden. Only patients can submit records." });
  }

  const { parameter, value, unit, recordedAt } = req.body;

  if (!parameter || value === undefined || value === null) {
    return res.status(400).json({
      success: false,
      message: "Parameter and value are required.",
    });
  }

  // Validate parameter name
  const validParameters = [
    "blood_sugar",
    "blood_pressure",
    "weight",
    "heart_rate",
    "body_temperature",
  ];

  if (!validParameters.includes(parameter)) {
    return res.status(400).json({
      success: false,
      message: `Invalid parameter: ${parameter}. Must be one of: ${validParameters.join(", ")}`,
    });
  }

  // Validate value format
  if (parameter === "blood_pressure") {
    const bpStr = String(value).trim();
    const parts = bpStr.split("/");
    if (parts.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Blood pressure must be in the format 'systolic/diastolic' (e.g., 120/80).",
      });
    }
    const systolic = Number(parts[0]);
    const diastolic = Number(parts[1]);
    if (isNaN(systolic) || systolic <= 0 || isNaN(diastolic) || diastolic <= 0) {
      return res.status(400).json({
        success: false,
        message: "Blood pressure systolic and diastolic must be positive numbers.",
      });
    }
  } else {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal <= 0) {
      return res.status(400).json({
        success: false,
        message: `${parameter.replace("_", " ")} must be a positive number.`,
      });
    }
  }

  const patientId = user.patientId;
  if (!patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. Patient ID not found." });
  }

  const recordDate = recordedAt ? new Date(recordedAt) : new Date();
  const whatsappMessageId = `portal_${patientId}_${parameter}_${Date.now()}`;

  const recordPayload = {
    patientId,
    parameter,
    value: parameter === "blood_pressure" ? String(value).trim() : Number(value),
    unit: unit || "",
    recordedAt: recordDate,
    source: "portal",
    confidence: 1.0,
    originalMessage: `Submitted via Patient Portal: ${parameter} = ${value} ${unit || ""}`,
    whatsappMessageId,
  };

  if (process.env.USE_MOCK_DATA === "true") {
    if (!MOCK_RECORDS[patientId]) {
      MOCK_RECORDS[patientId] = [];
    }
    MOCK_RECORDS[patientId].push(recordPayload);

    return res.status(201).json({
      success: true,
      message: "Health record submitted successfully (mock mode).",
      record: recordPayload,
    });
  }

  try {
    const record = await HealthRecord.create(recordPayload);
    return res.status(201).json({
      success: true,
      message: "Health record submitted successfully.",
      record,
    });
  } catch (error) {
    console.error("Error creating health record:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save health record.",
    });
  }
};

// ==============================
// Get Patient Timeline
// ==============================
export const getPatientTimeline = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role === "patient" && user.patientId !== patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. You can only access your own health records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = [...(MOCK_RECORDS[patientId] || [])].reverse();
    return res.status(200).json({
      success: true,
      totalRecords: records.length,
      records,
    });
  }

  try {
    const records = await HealthRecord.find({
      patientId,
    })
      .sort({
        recordedAt: -1,
      })
      .select(
        "-_id parameter value unit recordedAt source confidence originalMessage"
      );

    return res.status(200).json({
      success: true,
      totalRecords: records.length,
      records,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient timeline.",
    });
  }
};

// ==============================
// Get Patient Summary
// ==============================
export const getPatientSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role === "patient" && user.patientId !== patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. You can only access your own health records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = [...(MOCK_RECORDS[patientId] || [])].reverse();
    const latest: Record<string, any> = {};

    for (const record of records) {
      if (!latest[record.parameter]) {
        latest[record.parameter] = {
          value: record.value,
          unit: record.unit,
          recordedAt: record.recordedAt,
          source: record.source,
          confidence: record.confidence,
        };
      }
    }

    return res.status(200).json({
      success: true,
      summary: latest,
    });
  }

  try {
    const records = await HealthRecord.find({
      patientId,
    }).sort({
      recordedAt: -1,
    });

    const latest: Record<string, any> = {};

    for (const record of records) {
      if (!latest[record.parameter]) {
        latest[record.parameter] = {
          value: record.value,
          unit: record.unit,
          recordedAt: record.recordedAt,
          source: record.source,
          confidence: record.confidence,
        };
      }
    }

    return res.status(200).json({
      success: true,
      summary: latest,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient summary.",
    });
  }
};

// ==============================
// Get Parameter Trend
// ==============================
export const getParameterTrend = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role === "patient" && user.patientId !== patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. You can only access your own health records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r: any) => r.parameter === parameter)
      .map((r: any) => ({
        value: r.value,
        unit: r.unit,
        recordedAt: r.recordedAt,
      }));

    return res.json({
      success: true,
      parameter,
      days,
      count: records.length,
      records,
    });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      patientId,
      parameter,
      recordedAt: {
        $gte: startDate,
      },
    })
      .sort({
        recordedAt: 1,
      })
      .select("-_id value unit recordedAt");

    return res.json({
      success: true,
      parameter,
      days,
      count: records.length,
      records,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch trend.",
    });
  }
};

// ==============================
// Get Parameter Statistics
// ==============================
export const getParameterStatistics = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  if (user.role === "patient" && user.patientId !== patientId) {
    return res.status(403).json({ success: false, message: "Forbidden. You can only access your own health records." });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r: any) => r.parameter === parameter);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found.",
      });
    }

    const numericValues = records
      .map((record: any) => Number(record.value))
      .filter((value: any) => !isNaN(value));

    const latest = numericValues[numericValues.length - 1] || 0;
    const minimum = numericValues.length > 0 ? Math.min(...numericValues) : 0;
    const maximum = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    const average = numericValues.length > 0
      ? numericValues.reduce((sum: any, value: any) => sum + value, 0) / numericValues.length
      : 0;

    return res.json({
      success: true,
      parameter,
      days,
      statistics: {
        latest,
        minimum,
        maximum,
        average: Number(average.toFixed(2)),
        totalReadings: numericValues.length,
      },
    });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      patientId,
      parameter,
      recordedAt: {
        $gte: startDate,
      },
    }).sort({
      recordedAt: 1,
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found.",
      });
    }

    const numericValues = records
      .map((record) => Number(record.value))
      .filter((value) => !isNaN(value));

    const latest = numericValues[numericValues.length - 1];
    const minimum = Math.min(...numericValues);
    const maximum = Math.max(...numericValues);
    const average =
      numericValues.reduce((sum, value) => sum + value, 0) /
      numericValues.length;

    return res.json({
      success: true,
      parameter,
      days,
      statistics: {
        latest,
        minimum,
        maximum,
        average: Number(average.toFixed(2)),
        totalReadings: numericValues.length,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch statistics.",
    });
  }
};
