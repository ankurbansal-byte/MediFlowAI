import { type TrendRecord } from "../components/TrendChart";

export interface ParameterStats {
  latest: string | number;
  average: string | number;
  highest: string | number;
  lowest: string | number;
  trendDirection: "Rising" | "Falling" | "Stable" | "No Data";
  unit: string;
  count: number;
}

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
    };
  }

  // Latest is simply the last record (since they are sorted in ascending order of recordedAt)
  const latestRecord = records[records.length - 1];
  const latestValue = latestRecord.value;

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
    };
  }
};
