import { Request, Response } from "express";
import HealthRecord from "../models/HealthRecord";
import { generateDemoRecords } from "../utils/demoData";

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
  const patientId = req.params.patientId as string;

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
  req: Request,
  res: Response
) => {
  const patientId = req.params.patientId as string;

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
  req: Request,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;

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
  req: Request,
  res: Response
) => {
  const patientId = req.params.patientId as string;
  const parameter = req.params.parameter as string;
  const days = Number(req.query.days) || 30;

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
