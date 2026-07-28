import { PARAMETER_REGISTRY } from "./parameterRegistry";

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  days: number;
}

export interface MetricComparison {
  parameter: string;
  context?: string;
  currentCount: number;
  currentAverage?: number;
  currentMin?: number;
  currentMax?: number;
  previousCount: number;
  previousAverage?: number;
  previousMin?: number;
  previousMax?: number;
  percentChangeAverage?: number; // percent change of average
}

export interface ParameterMetrics {
  parameter: string;
  count: number;
  latest?: {
    value: any;
    unit: string;
    recordedAt: Date;
    context?: string;
    timeContext?: string;
  };
  min?: any;
  max?: any;
  average?: any;
  readingFrequencyPerDay: number;
  byContext?: Record<string, {
    count: number;
    min?: number;
    max?: number;
    average?: number;
    latest?: {
      value: number;
      unit: string;
      recordedAt: Date;
    };
  }>;
}

export interface LabObservationSummary {
  testName: string;
  canonicalTestKey?: string;
  value: any;
  unit: string;
  flag?: string;
  referenceRangeText?: string;
  specimenDate?: Date;
}

export interface DeterministicAnalyticsResult {
  periodDays: number | string;
  startDate: Date;
  endDate: Date;
  totalRoutineReadings: number;
  totalLabObservations: number;
  earliestDate?: Date;
  latestDate?: Date;
  parameterMetrics: Record<string, ParameterMetrics>;
  comparisons: MetricComparison[];
  labObservations: LabObservationSummary[];
}

/**
 * Parses numeric value safely. If blood_pressure, systolic/diastolic are returned separately.
 */
export function parseRecordValue(val: any, parameter: string): { num: number; sys?: number; dia?: number } | null {
  if (val === undefined || val === null) return null;
  if (parameter === "blood_pressure") {
    const parts = String(val).split("/");
    if (parts.length === 2) {
      const s = parseFloat(parts[0]);
      const d = parseFloat(parts[1]);
      if (!isNaN(s) && !isNaN(d)) {
        return { num: s, sys: s, dia: d };
      }
    }
    return null;
  }
  const n = parseFloat(val);
  return isNaN(n) ? null : { num: n };
}

/**
 * Calculates deterministic analytics for routine health records and lab observations.
 */
export function calculateDeterministicAnalytics(
  records: any[], // HealthRecord array
  labs: any[],    // LabObservation array
  days: number,   // Selected time window (e.g. 7, 30, 90, 36500 for all history)
  refDateInput?: Date
): DeterministicAnalyticsResult {
  const refDate = refDateInput || new Date();

  // Define time windows
  const currentStart = new Date(refDate);
  currentStart.setDate(currentStart.getDate() - days);
  const currentEnd = refDate;

  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - days);
  const prevEnd = currentStart;

  // Filter records in current and previous periods
  const currentRecords = records.filter(r => {
    const d = new Date(r.recordedAt);
    return d >= currentStart && d <= currentEnd;
  });

  const prevRecords = records.filter(r => {
    const d = new Date(r.recordedAt);
    return d >= prevStart && d < prevEnd;
  });

  // Filter lab observations (only current period)
  const currentLabs = labs.filter(l => {
    const d = new Date(l.specimenDate || l.createdAt);
    return d >= currentStart && d <= currentEnd;
  });

  // Sort current records ascending for chronological calculations
  const sortedCurrentRecords = [...currentRecords].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const earliestDate = sortedCurrentRecords.length > 0 ? new Date(sortedCurrentRecords[0].recordedAt) : undefined;
  const latestDate = sortedCurrentRecords.length > 0 ? new Date(sortedCurrentRecords[sortedCurrentRecords.length - 1].recordedAt) : undefined;

  // Group by parameter
  const currentByParam: Record<string, any[]> = {};
  for (const r of currentRecords) {
    if (!currentByParam[r.parameter]) currentByParam[r.parameter] = [];
    currentByParam[r.parameter].push(r);
  }

  const prevByParam: Record<string, any[]> = {};
  for (const r of prevRecords) {
    if (!prevByParam[r.parameter]) prevByParam[r.parameter] = [];
    prevByParam[r.parameter].push(r);
  }

  const parameterMetrics: Record<string, ParameterMetrics> = {};
  const comparisons: MetricComparison[] = [];

  // Standard routine parameters
  const parameters = ["blood_sugar", "blood_pressure", "heart_rate", "body_temperature", "weight", "oxygen_saturation", "respiratory_rate", "height"];

  for (const param of parameters) {
    const cRecs = currentByParam[param] || [];
    const pRecs = prevByParam[param] || [];

    if (cRecs.length === 0) continue;

    // Latest reading (newest recordedAt)
    const sortedParamRecs = [...cRecs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const latestRec = sortedParamRecs[0];

    const latest = {
      value: latestRec.value,
      unit: latestRec.unit,
      recordedAt: new Date(latestRec.recordedAt),
      context: latestRec.context,
      timeContext: latestRec.timeContext,
    };

    let min: any = undefined;
    let max: any = undefined;
    let average: any = undefined;
    let byContext: any = undefined;

    if (param === "blood_pressure") {
      // Calculate BP min/max/average for systolic and diastolic separately
      let sysSum = 0;
      let diaSum = 0;
      let validCount = 0;
      let minSys = Infinity;
      let maxSys = -Infinity;
      let minDia = Infinity;
      let maxDia = -Infinity;

      for (const r of cRecs) {
        const parsed = parseRecordValue(r.value, param);
        if (parsed && parsed.sys !== undefined && parsed.dia !== undefined) {
          sysSum += parsed.sys;
          diaSum += parsed.dia;
          validCount++;
          if (parsed.sys < minSys) minSys = parsed.sys;
          if (parsed.sys > maxSys) maxSys = parsed.sys;
          if (parsed.dia < minDia) minDia = parsed.dia;
          if (parsed.dia > maxDia) maxDia = parsed.dia;
        }
      }

      if (validCount > 0) {
        min = `${minSys}/${minDia}`;
        max = `${maxSys}/${maxDia}`;
        average = `${Math.round(sysSum / validCount)}/${Math.round(diaSum / validCount)}`;
      }

      // Comparison for BP
      let prevSysSum = 0;
      let prevDiaSum = 0;
      let prevValidCount = 0;
      for (const r of pRecs) {
        const parsed = parseRecordValue(r.value, param);
        if (parsed && parsed.sys !== undefined && parsed.dia !== undefined) {
          prevSysSum += parsed.sys;
          prevDiaSum += parsed.dia;
          prevValidCount++;
        }
      }

      comparisons.push({
        parameter: "blood_pressure_systolic",
        currentCount: validCount,
        currentAverage: validCount > 0 ? Math.round(sysSum / validCount) : undefined,
        currentMin: minSys !== Infinity ? minSys : undefined,
        currentMax: maxSys !== -Infinity ? maxSys : undefined,
        previousCount: prevValidCount,
        previousAverage: prevValidCount > 0 ? Math.round(prevSysSum / prevValidCount) : undefined,
      });

      comparisons.push({
        parameter: "blood_pressure_diastolic",
        currentCount: validCount,
        currentAverage: validCount > 0 ? Math.round(diaSum / validCount) : undefined,
        currentMin: minDia !== Infinity ? minDia : undefined,
        currentMax: maxDia !== -Infinity ? maxDia : undefined,
        previousCount: prevValidCount,
        previousAverage: prevValidCount > 0 ? Math.round(prevDiaSum / prevValidCount) : undefined,
      });

    } else if (param === "blood_sugar") {
      // Separated by Glucose Context to avoid mixing fasting, post_meal, pre_meal, random
      byContext = {};
      const contexts = ["fasting", "pre_meal", "post_meal", "random", "unknown"];

      for (const ctx of contexts) {
        const ctxRecs = cRecs.filter(r => r.context === ctx || (ctx === "unknown" && !r.context));
        if (ctxRecs.length === 0) continue;

        let sum = 0;
        let cCount = 0;
        let cMin = Infinity;
        let cMax = -Infinity;
        let cLatest: any = undefined;

        const sortedCtxRecs = [...ctxRecs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        cLatest = {
          value: Number(sortedCtxRecs[0].value),
          unit: sortedCtxRecs[0].unit,
          recordedAt: new Date(sortedCtxRecs[0].recordedAt),
        };

        for (const r of ctxRecs) {
          const parsed = parseRecordValue(r.value, param);
          if (parsed) {
            sum += parsed.num;
            cCount++;
            if (parsed.num < cMin) cMin = parsed.num;
            if (parsed.num > cMax) cMax = parsed.num;
          }
        }

        if (cCount > 0) {
          byContext[ctx] = {
            count: cCount,
            min: cMin,
            max: cMax,
            average: Number((sum / cCount).toFixed(1)),
            latest: cLatest,
          };

          // Comparison for this glucose context
          const pCtxRecs = pRecs.filter(r => r.context === ctx || (ctx === "unknown" && !r.context));
          let pSum = 0;
          let pCount = 0;
          for (const r of pCtxRecs) {
            const parsed = parseRecordValue(r.value, param);
            if (parsed) {
              pSum += parsed.num;
              pCount++;
            }
          }

          comparisons.push({
            parameter: "blood_sugar",
            context: ctx,
            currentCount: cCount,
            currentAverage: Number((sum / cCount).toFixed(1)),
            currentMin: cMin,
            currentMax: cMax,
            previousCount: pCount,
            previousAverage: pCount > 0 ? Number((pSum / pCount).toFixed(1)) : undefined,
          });
        }
      }

      // Overall blood sugar stats if semantically requested, but strictly distincted in narrative
      let sum = 0;
      let count = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const r of cRecs) {
        const parsed = parseRecordValue(r.value, param);
        if (parsed) {
          sum += parsed.num;
          count++;
          if (parsed.num < minVal) minVal = parsed.num;
          if (parsed.num > maxVal) maxVal = parsed.num;
        }
      }
      if (count > 0) {
        min = minVal;
        max = maxVal;
        average = Number((sum / count).toFixed(1));
      }

    } else {
      // Standard numerical parameter
      let sum = 0;
      let count = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (const r of cRecs) {
        const parsed = parseRecordValue(r.value, param);
        if (parsed) {
          sum += parsed.num;
          count++;
          if (parsed.num < minVal) minVal = parsed.num;
          if (parsed.num > maxVal) maxVal = parsed.num;
        }
      }

      if (count > 0) {
        min = minVal;
        max = maxVal;
        average = Number((sum / count).toFixed(1));

        // Comparison
        let pSum = 0;
        let pCount = 0;
        for (const r of pRecs) {
          const parsed = parseRecordValue(r.value, param);
          if (parsed) {
            pSum += parsed.num;
            pCount++;
          }
        }

        comparisons.push({
          parameter: param,
          currentCount: count,
          currentAverage: Number((sum / count).toFixed(1)),
          currentMin: minVal,
          currentMax: maxVal,
          previousCount: pCount,
          previousAverage: pCount > 0 ? Number((pSum / pCount).toFixed(1)) : undefined,
        });
      }
    }

    const frequency = Number((cRecs.length / days).toFixed(2));

    parameterMetrics[param] = {
      parameter: param,
      count: cRecs.length,
      latest,
      min,
      max,
      average,
      readingFrequencyPerDay: frequency,
      byContext,
    };
  }

  // Map lab observations directly from authentic LabObservation documents
  const labObservations: LabObservationSummary[] = currentLabs.map(l => ({
    testName: l.testName,
    canonicalTestKey: l.canonicalTestKey,
    value: l.value,
    unit: l.unit,
    flag: l.flag,
    referenceRangeText: l.referenceRangeText,
    specimenDate: l.specimenDate ? new Date(l.specimenDate) : undefined,
  }));

  return {
    periodDays: days,
    startDate: currentStart,
    endDate: currentEnd,
    totalRoutineReadings: currentRecords.length,
    totalLabObservations: currentLabs.length,
    earliestDate,
    latestDate,
    parameterMetrics,
    comparisons,
    labObservations,
  };
}
