import { Request, Response } from "express";
import HealthRecord from "../models/HealthRecord";

type PatientDiscoveryResult = {
  patientId: string;
  latestRecordedAt: Date;
  totalRecords: number;
};

// ==============================
// Fallback Mock Data Definition
// ==============================
const MOCK_PATIENTS = [
  { patientId: "PAT-001", latestRecordedAt: new Date(Date.now() - 3600000 * 4), totalRecords: 24 },
  { patientId: "PAT-002", latestRecordedAt: new Date(Date.now() - 3600000 * 24), totalRecords: 15 },
  { patientId: "PAT-003", latestRecordedAt: new Date(Date.now() - 3600000 * 48), totalRecords: 8 },
];

const MOCK_RECORDS: Record<string, any[]> = {
  "PAT-001": [
    { parameter: "blood_sugar", value: 110, unit: "mg/dL", recordedAt: new Date(Date.now() - 3600000 * 4), source: "text", confidence: 0.98, originalMessage: "Blood sugar is 110" },
    { parameter: "blood_pressure", value: "122/81", unit: "mmHg", recordedAt: new Date(Date.now() - 3600000 * 8), source: "text", confidence: 0.99, originalMessage: "BP is 122/81" },
    { parameter: "heart_rate", value: 72, unit: "bpm", recordedAt: new Date(Date.now() - 3600000 * 12), source: "text", confidence: 0.95, originalMessage: "Heart rate is 72" },
    { parameter: "body_temperature", value: 36.6, unit: "°C", recordedAt: new Date(Date.now() - 3600000 * 16), source: "text", confidence: 0.99, originalMessage: "Temp 36.6C" },
    { parameter: "weight", value: 70, unit: "kg", recordedAt: new Date(Date.now() - 3600000 * 20), source: "text", confidence: 0.99, originalMessage: "Weight is 70kg" },
    { parameter: "blood_sugar", value: 145, unit: "mg/dL", recordedAt: new Date(Date.now() - 3600000 * 28), source: "text", confidence: 0.98, originalMessage: "Sugar 145" },
    { parameter: "blood_pressure", value: "135/88", unit: "mmHg", recordedAt: new Date(Date.now() - 3600000 * 32), source: "text", confidence: 0.99, originalMessage: "BP 135/88" },
    { parameter: "heart_rate", value: 84, unit: "bpm", recordedAt: new Date(Date.now() - 3600000 * 36), source: "text", confidence: 0.95, originalMessage: "Pulse is 84" },
  ],
  "PAT-002": [
    { parameter: "blood_sugar", value: 155, unit: "mg/dL", recordedAt: new Date(Date.now() - 3600000 * 24), source: "text", confidence: 0.98, originalMessage: "Sugar 155" },
    { parameter: "blood_pressure", value: "142/92", unit: "mmHg", recordedAt: new Date(Date.now() - 3600000 * 30), source: "text", confidence: 0.99, originalMessage: "BP is 142/92" },
    { parameter: "heart_rate", value: 88, unit: "bpm", recordedAt: new Date(Date.now() - 3600000 * 36), source: "text", confidence: 0.95, originalMessage: "Pulse is 88" },
    { parameter: "body_temperature", value: 37.8, unit: "°C", recordedAt: new Date(Date.now() - 3600000 * 42), source: "text", confidence: 0.99, originalMessage: "Fever around 37.8C" },
    { parameter: "weight", value: 85, unit: "kg", recordedAt: new Date(Date.now() - 3600000 * 48), source: "text", confidence: 0.99, originalMessage: "Weight 85 kg" },
  ],
  "PAT-003": [
    { parameter: "blood_sugar", value: 92, unit: "mg/dL", recordedAt: new Date(Date.now() - 3600000 * 48), source: "text", confidence: 0.98, originalMessage: "Sugar 92" },
    { parameter: "blood_pressure", value: "115/75", unit: "mmHg", recordedAt: new Date(Date.now() - 3600000 * 56), source: "text", confidence: 0.99, originalMessage: "BP 115/75" },
    { parameter: "heart_rate", value: 65, unit: "bpm", recordedAt: new Date(Date.now() - 3600000 * 64), source: "text", confidence: 0.95, originalMessage: "Heart rate is 65" },
  ]
};

// ==============================
// List Patients
// ==============================
export const getPatients = async (_req: Request, res: Response) => {
  if (process.env.USE_MOCK_DATA === "true") {
    return res.status(200).json({
      success: true,
      totalPatients: MOCK_PATIENTS.length,
      patients: MOCK_PATIENTS,
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
// Get Patient Timeline
// ==============================
export const getPatientTimeline = async (
  req: Request,
  res: Response
) => {
  const { patientId } = req.params;

  if (process.env.USE_MOCK_DATA === "true") {
    const records = MOCK_RECORDS[patientId] || [];
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
  req: Request,
  res: Response
) => {
  const { patientId } = req.params;

  if (process.env.USE_MOCK_DATA === "true") {
    const records = MOCK_RECORDS[patientId] || [];
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
  req: Request,
  res: Response
) => {
  const { patientId, parameter } = req.params;
  const days = Number(req.query.days) || 30;

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r) => r.parameter === parameter)
      .map((r) => ({
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
  req: Request,
  res: Response
) => {
  const { patientId, parameter } = req.params;
  const days = Number(req.query.days) || 30;

  if (process.env.USE_MOCK_DATA === "true") {
    const records = (MOCK_RECORDS[patientId] || [])
      .filter((r) => r.parameter === parameter);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found.",
      });
    }

    const numericValues = records
      .map((record) => Number(record.value))
      .filter((value) => !isNaN(value));

    const latest = numericValues[numericValues.length - 1] || 0;
    const minimum = numericValues.length > 0 ? Math.min(...numericValues) : 0;
    const maximum = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    const average = numericValues.length > 0
      ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
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
