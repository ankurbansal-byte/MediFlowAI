import { type PatientSummaryMap } from "../services/patientService";

export interface ClinicalAlert {
  parameter: string;
  severity: "critical" | "warning";
  message: string;
  valueString: string;
}

export interface ClinicalStatusResult {
  status: "Stable" | "Needs Attention" | "Critical";
  alerts: ClinicalAlert[];
  abnormalCount: number;
}

export const evaluatePatientClinicalStatus = (
  summary: PatientSummaryMap | null | undefined
): ClinicalStatusResult => {
  const alerts: ClinicalAlert[] = [];
  let abnormalCount = 0;
  let hasCritical = false;

  if (!summary) {
    return {
      status: "Stable",
      alerts: [],
      abnormalCount: 0,
    };
  }

  // 1. Blood Sugar
  const bs = summary.blood_sugar;
  if (bs && bs.value !== undefined && bs.value !== null) {
    const val = Number(bs.value);
    if (!isNaN(val)) {
      const unit = bs.unit || "mg/dL";
      if (val > 250 || val < 55) {
        hasCritical = true;
        abnormalCount++;
        alerts.push({
          parameter: "blood_sugar",
          severity: "critical",
          message: val > 250 ? "Critical High Blood Sugar" : "Critical Low Blood Sugar",
          valueString: `${val} ${unit}`,
        });
      } else if (val > 140 || val < 70) {
        abnormalCount++;
        alerts.push({
          parameter: "blood_sugar",
          severity: "warning",
          message: val > 140 ? "Elevated Blood Sugar" : "Low Blood Sugar",
          valueString: `${val} ${unit}`,
        });
      }
    }
  }

  // 2. Blood Pressure
  const bp = summary.blood_pressure;
  if (bp && bp.value !== undefined && bp.value !== null) {
    const bpStr = String(bp.value).trim();
    const unit = bp.unit || "mmHg";
    const parts = bpStr.split("/");
    if (parts.length === 2) {
      const systolic = Number(parts[0]);
      const diastolic = Number(parts[1]);
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        if (systolic >= 140 || diastolic >= 90 || systolic < 90 || diastolic < 50) {
          hasCritical = true;
          abnormalCount++;
          alerts.push({
            parameter: "blood_pressure",
            severity: "critical",
            message: (systolic >= 140 || diastolic >= 90) ? "Hypertensive Crisis Range" : "Critical Hypotension",
            valueString: `${bpStr} ${unit}`,
          });
        } else if (systolic >= 130 || diastolic >= 85) {
          abnormalCount++;
          alerts.push({
            parameter: "blood_pressure",
            severity: "warning",
            message: "Elevated Blood Pressure",
            valueString: `${bpStr} ${unit}`,
          });
        }
      }
    } else {
      const val = Number(bpStr);
      if (!isNaN(val)) {
        if (val >= 140 || val < 90) {
          hasCritical = true;
          abnormalCount++;
          alerts.push({
            parameter: "blood_pressure",
            severity: "critical",
            message: val >= 140 ? "Critical High Blood Pressure" : "Critical Low Blood Pressure",
            valueString: `${val} ${unit}`,
          });
        } else if (val >= 130) {
          abnormalCount++;
          alerts.push({
            parameter: "blood_pressure",
            severity: "warning",
            message: "Elevated Blood Pressure",
            valueString: `${val} ${unit}`,
          });
        }
      }
    }
  }

  // 3. Heart Rate
  const hr = summary.heart_rate;
  if (hr && hr.value !== undefined && hr.value !== null) {
    const val = Number(hr.value);
    if (!isNaN(val)) {
      const unit = hr.unit || "bpm";
      if (val > 120 || val < 45) {
        hasCritical = true;
        abnormalCount++;
        alerts.push({
          parameter: "heart_rate",
          severity: "critical",
          message: val > 120 ? "Tachycardia (Critical High HR)" : "Bradycardia (Critical Low HR)",
          valueString: `${val} ${unit}`,
        });
      } else if (val > 100 || val < 60) {
        abnormalCount++;
        alerts.push({
          parameter: "heart_rate",
          severity: "warning",
          message: val > 100 ? "Elevated Heart Rate" : "Low Heart Rate",
          valueString: `${val} ${unit}`,
        });
      }
    }
  }

  // 4. Body Temperature
  const temp = summary.body_temperature;
  if (temp && temp.value !== undefined && temp.value !== null) {
    const val = Number(temp.value);
    if (!isNaN(val)) {
      const unit = temp.unit || "°F";
      const isCelsius = unit.toLowerCase().includes("c") || val < 45;

      if (isCelsius) {
        if (val > 39.0 || val < 35.0) {
          hasCritical = true;
          abnormalCount++;
          alerts.push({
            parameter: "body_temperature",
            severity: "critical",
            message: val > 39.0 ? "High Fever (Hyperpyrexia)" : "Hypothermia",
            valueString: `${val} ${unit}`,
          });
        } else if (val > 37.2 || val < 36.1) {
          abnormalCount++;
          alerts.push({
            parameter: "body_temperature",
            severity: "warning",
            message: val > 37.2 ? "Elevated Temperature" : "Mild Hypothermia Range",
            valueString: `${val} ${unit}`,
          });
        }
      } else {
        if (val > 102.2 || val < 95.0) {
          hasCritical = true;
          abnormalCount++;
          alerts.push({
            parameter: "body_temperature",
            severity: "critical",
            message: val > 102.2 ? "High Fever (Hyperpyrexia)" : "Hypothermia",
            valueString: `${val} ${unit}`,
          });
        } else if (val > 99.0 || val < 97.0) {
          abnormalCount++;
          alerts.push({
            parameter: "body_temperature",
            severity: "warning",
            message: val > 99.0 ? "Elevated Temperature" : "Mild Hypothermia Range",
            valueString: `${val} ${unit}`,
          });
        }
      }
    }
  }

  // Handle multiple abnormal readings alert
  if (abnormalCount >= 2) {
    alerts.unshift({
      parameter: "multiple",
      severity: "warning",
      message: "Multiple Abnormal Readings",
      valueString: `${abnormalCount} parameters out of normal range`,
    });
  }

  let status: "Stable" | "Needs Attention" | "Critical" = "Stable";
  if (hasCritical) {
    status = "Critical";
  } else if (abnormalCount > 0) {
    status = "Needs Attention";
  }

  return {
    status,
    alerts,
    abnormalCount,
  };
};
