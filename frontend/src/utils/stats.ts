import { type TrendRecord } from "../components/TrendChart";
import { formatLongDate } from "./date";

export interface ParameterStats {
  latest: string | number;
  average: string | number;
  highest: string | number;
  lowest: string | number;
  trendDirection: "Rising" | "Falling" | "Stable" | "No Data";
  unit: string;
  count: number;
  lastUpdated: string;
}

export interface ConsistencyInfo {
  level: "High Consistency" | "Moderate Consistency" | "Low Consistency" | "No Data";
  color: string;
  percentage: number;
  description: string;
}

export const calculateReadingConsistency = (
  count: number,
  period: number
): ConsistencyInfo => {
  if (count === 0) {
    return {
      level: "No Data",
      color: "#6c7890", // var(--muted)
      percentage: 0,
      description: `No readings recorded for this parameter in the last ${period} days.`,
    };
  }

  // Define thresholds based on the selected period
  if (period === 7) {
    if (count >= 5) {
      return {
        level: "High Consistency",
        color: "#178f80", // teal
        percentage: 100,
        description: `Excellent frequency! Recorded ${count} readings in the last 7 days (target: 5+).`,
      };
    } else if (count >= 3) {
      return {
        level: "Moderate Consistency",
        color: "#d67b2a", // orange
        percentage: 60,
        description: `Good progress. Recorded ${count} readings in the last 7 days (target: 5+).`,
      };
    } else {
      return {
        level: "Low Consistency",
        color: "#c84d64", // rose
        percentage: 25,
        description: `Infrequent monitoring. Only ${count} reading${count > 1 ? "s" : ""} recorded in the last 7 days.`,
      };
    }
  } else if (period === 90) {
    if (count >= 45) {
      return {
        level: "High Consistency",
        color: "#178f80", // teal
        percentage: 100,
        description: `Excellent frequency! Recorded ${count} readings in the last 90 days (target: 45+).`,
      };
    } else if (count >= 15) {
      return {
        level: "Moderate Consistency",
        color: "#d67b2a", // orange
        percentage: 60,
        description: `Stable monitoring. Recorded ${count} readings in the last 90 days (target: 45+).`,
      };
    } else {
      return {
        level: "Low Consistency",
        color: "#c84d64", // rose
        percentage: 25,
        description: `Attention needed. Only ${count} reading${count > 1 ? "s" : ""} recorded in the last 90 days.`,
      };
    }
  } else {
    // Default to 30 days
    if (count >= 15) {
      return {
        level: "High Consistency",
        color: "#178f80", // teal
        percentage: 100,
        description: `Excellent frequency! Recorded ${count} readings in the last 30 days (target: 15+).`,
      };
    } else if (count >= 5) {
      return {
        level: "Moderate Consistency",
        color: "#d67b2a", // orange
        percentage: 60,
        description: `Satisfactory. Recorded ${count} readings in the last 30 days (target: 15+).`,
      };
    } else {
      return {
        level: "Low Consistency",
        color: "#c84d64", // rose
        percentage: 25,
        description: `Monitoring frequency is low. Only ${count} reading${count > 1 ? "s" : ""} recorded in the last 30 days.`,
      };
    }
  }
};

export const calculateParameterStats = (
  records: TrendRecord[],
  parameter: string,
  fallbackUnit?: string
): ParameterStats => {
  const defaultUnitMap: Record<string, string> = {
    blood_sugar: "mg/dL",
    blood_pressure: "mmHg",
    heart_rate: "bpm",
    body_temperature: "°C",
    weight: "kg",
  };

  const unit = records.find((r) => r.unit)?.unit || fallbackUnit || defaultUnitMap[parameter] || "";

  if (!records || records.length === 0) {
    return {
      latest: "—",
      average: "—",
      highest: "—",
      lowest: "—",
      trendDirection: "No Data",
      unit,
      count: 0,
      lastUpdated: "—",
    };
  }

  // Latest is simply the last record (since they are sorted in ascending order of recordedAt)
  const latestRecord = records[records.length - 1];
  const latestValue = latestRecord.value;
  const lastUpdated = latestRecord.recordedAt ? formatLongDate(latestRecord.recordedAt) : "—";

  if (parameter === "blood_pressure") {
    const parsedBP = records
      .map((r) => {
        const parts = String(r.value).split("/");
        if (parts.length === 2) {
          const sys = Number(parts[0].trim());
          const dia = Number(parts[1].trim());
          if (!isNaN(sys) && !isNaN(dia)) {
            return { sys, dia };
          }
        }
        return null;
      })
      .filter((bp): bp is { sys: number; dia: number } => bp !== null);

    if (parsedBP.length === 0) {
      return {
        latest: latestValue ?? "—",
        average: "—",
        highest: "—",
        lowest: "—",
        trendDirection: "Stable",
        unit,
        count: 0,
        lastUpdated,
      };
    }

    // Averages
    const avgSys = parsedBP.reduce((sum, bp) => sum + bp.sys, 0) / parsedBP.length;
    const avgDia = parsedBP.reduce((sum, bp) => sum + bp.dia, 0) / parsedBP.length;

    // Highest / Lowest
    const highestSys = Math.max(...parsedBP.map((bp) => bp.sys));
    const highestDia = Math.max(...parsedBP.map((bp) => bp.dia));
    const lowestSys = Math.min(...parsedBP.map((bp) => bp.sys));
    const lowestDia = Math.min(...parsedBP.map((bp) => bp.dia));

    // Trend Direction based on Systolic
    let trendDirection: "Rising" | "Falling" | "Stable" = "Stable";
    if (parsedBP.length >= 2) {
      const firstSys = parsedBP[0].sys;
      const latestSys = parsedBP[parsedBP.length - 1].sys;
      if (latestSys > firstSys) trendDirection = "Rising";
      else if (latestSys < firstSys) trendDirection = "Falling";
    }

    return {
      latest: latestValue ?? "—",
      average: `${Math.round(avgSys)}/${Math.round(avgDia)}`,
      highest: `${highestSys}/${highestDia}`,
      lowest: `${lowestSys}/${lowestDia}`,
      trendDirection,
      unit,
      count: parsedBP.length,
      lastUpdated,
    };
  } else {
    // For numeric parameters
    const parsedNumeric = records
      .map((r) => Number(r.value))
      .filter((v) => !isNaN(v) && isFinite(v));

    if (parsedNumeric.length === 0) {
      return {
        latest: latestValue ?? "—",
        average: "—",
        highest: "—",
        lowest: "—",
        trendDirection: "Stable",
        unit,
        count: 0,
        lastUpdated,
      };
    }

    const latestVal = Number(latestValue);
    const avgVal = parsedNumeric.reduce((sum, v) => sum + v, 0) / parsedNumeric.length;
    const maxVal = Math.max(...parsedNumeric);
    const minVal = Math.min(...parsedNumeric);

    let trendDirection: "Rising" | "Falling" | "Stable" = "Stable";
    if (parsedNumeric.length >= 2) {
      const firstVal = parsedNumeric[0];
      const lastVal = parsedNumeric[parsedNumeric.length - 1];
      if (lastVal > firstVal) trendDirection = "Rising";
      else if (lastVal < firstVal) trendDirection = "Falling";
    }

    // Format body temperature to 1 decimal place, others nicely as well
    const formatValue = (val: number) => {
      if (parameter === "body_temperature") {
        return val.toFixed(1);
      }
      return val % 1 === 0 ? val.toString() : val.toFixed(1);
    };

    return {
      latest: !isNaN(latestVal) ? formatValue(latestVal) : (latestValue ?? "—"),
      average: formatValue(avgVal),
      highest: formatValue(maxVal),
      lowest: formatValue(minVal),
      trendDirection,
      unit,
      count: parsedNumeric.length,
      lastUpdated,
    };
  }
};
