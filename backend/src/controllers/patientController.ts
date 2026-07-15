import { Request, Response } from "express";
import HealthRecord from "../models/HealthRecord";

type PatientDiscoveryResult = {
  patientId: string;
  latestRecordedAt: Date;
  totalRecords: number;
};

// ==============================
// List Patients
// ==============================
export const getPatients = async (_req: Request, res: Response) => {
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
  try {
    const { patientId } = req.params;

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
  try {
    const { patientId } = req.params;

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
  try {
    const { patientId, parameter } = req.params;

    const days = Number(req.query.days) || 30;

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
  try {
    const { patientId, parameter } = req.params;

    const days = Number(req.query.days) || 30;

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
