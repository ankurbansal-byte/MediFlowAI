/**
 * Professional Demo Data Generator
 * Programmatically generates 14 days of realistic health records for 6 patients,
 * each exhibiting a distinct clinical pattern.
 */

export interface DemoRecord {
  patientId: string;
  parameter: string;
  value: string | number;
  unit: string;
  recordedAt: Date;
  source: string;
  confidence: number;
  originalMessage: string;
  whatsappMessageId: string;
}

export function generateDemoRecords(): DemoRecord[] {
  const records: DemoRecord[] = [];
  const totalDays = 14;

  const patients = [
    { id: "PAT-101", name: "John Doe", pattern: "improving_diabetes" },
    { id: "PAT-102", name: "Jane Smith", pattern: "worsening_diabetes" },
    { id: "PAT-103", name: "Robert Johnson", pattern: "stable" },
    { id: "PAT-104", name: "Emily Davis", pattern: "hypertension" },
    { id: "PAT-105", name: "Michael Brown", pattern: "weight_loss" },
    { id: "PAT-106", name: "Sarah Wilson", pattern: "fever_recovery" },
  ];

  const now = new Date();

  for (const patient of patients) {
    for (let day = totalDays - 1; day >= 0; day--) {
      // Calculate a base date for this day relative to today
      const baseDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);

      // Generate the 5 required parameters
      const parameters = [
        "blood_sugar",
        "blood_pressure",
        "weight",
        "heart_rate",
        "body_temperature",
      ];

      for (const param of parameters) {
        let value: string | number = "";
        let unit = "";
        let originalMessage = "";
        let hourOffset = 8; // Default morning

        // Clinical Patterns Implementation
        switch (patient.pattern) {
          case "improving_diabetes": {
            if (param === "blood_sugar") {
              // High in the past (210) to normal (98) over 14 days
              const progress = (totalDays - 1 - day) / (totalDays - 1); // 0 (past) to 1 (now)
              const baseSugar = 210 - progress * 112; // 210 down to 98
              const noise = Math.floor(Math.random() * 11) - 5; // +/- 5
              value = Math.round(baseSugar + noise);
              unit = "mg/dL";
              originalMessage = day === totalDays - 1
                ? `Hi doctor, my fasting blood sugar is quite high this morning: ${value} mg/dL. Feeling a bit fatigued.`
                : `Morning update. Blood sugar is ${value} mg/dL.`;
              hourOffset = 8; // Fasting sugar in morning
            } else if (param === "blood_pressure") {
              const noiseSystolic = Math.floor(Math.random() * 7) - 3;
              const noiseDiastolic = Math.floor(Math.random() * 5) - 2;
              value = `${132 + noiseSystolic}/${84 + noiseDiastolic}`;
              unit = "mmHg";
              originalMessage = `My BP reading is ${value} mmHg.`;
              hourOffset = 9;
            } else if (param === "weight") {
              value = 82.5;
              unit = "kg";
              originalMessage = `Weight: 82.5kg.`;
              hourOffset = 7;
            } else if (param === "heart_rate") {
              value = 72 + (Math.floor(Math.random() * 5) - 2);
              unit = "bpm";
              originalMessage = `HR checked at ${value} bpm.`;
              hourOffset = 12;
            } else {
              // body_temperature
              value = Number((36.6 + (Math.random() * 0.3 - 0.15)).toFixed(1));
              unit = "°C";
              originalMessage = `Temp is normal today: ${value} C.`;
              hourOffset = 18;
            }
            break;
          }

          case "worsening_diabetes": {
            if (param === "blood_sugar") {
              // Normal in the past (115) to very high (265) over 14 days
              const progress = (totalDays - 1 - day) / (totalDays - 1); // 0 (past) to 1 (now)
              const baseSugar = 115 + progress * 150; // 115 up to 265
              const noise = Math.floor(Math.random() * 15) - 7;
              value = Math.round(baseSugar + noise);
              unit = "mg/dL";
              originalMessage = day === 0
                ? `My blood sugar is spiked to ${value} mg/dL today. I feel extremely thirsty and have a dry mouth.`
                : `Fasting blood sugar: ${value} mg/dL.`;
              hourOffset = 8;
            } else if (param === "blood_pressure") {
              const noiseSystolic = Math.floor(Math.random() * 5) - 2;
              const noiseDiastolic = Math.floor(Math.random() * 5) - 2;
              value = `${120 + noiseSystolic}/${78 + noiseDiastolic}`;
              unit = "mmHg";
              originalMessage = `BP is ${value} mmHg.`;
              hourOffset = 9;
            } else if (param === "weight") {
              value = 68.0;
              unit = "kg";
              originalMessage = `Weight: 68.0 kg.`;
              hourOffset = 7;
            } else if (param === "heart_rate") {
              // Slight increase in HR as clinical condition worsens
              const progress = (totalDays - 1 - day) / (totalDays - 1);
              const baseHR = 70 + progress * 10; // 70 to 80
              value = Math.round(baseHR + (Math.random() * 4 - 2));
              unit = "bpm";
              originalMessage = `Heart rate is ${value} bpm.`;
              hourOffset = 12;
            } else {
              value = Number((36.7 + (Math.random() * 0.3 - 0.15)).toFixed(1));
              unit = "°C";
              originalMessage = `Body temp: ${value} °C.`;
              hourOffset = 18;
            }
            break;
          }

          case "stable": {
            if (param === "blood_sugar") {
              value = 92 + (Math.floor(Math.random() * 13) - 6); // 86 to 99
              unit = "mg/dL";
              originalMessage = `Blood sugar: ${value} mg/dL. Everything stable.`;
              hourOffset = 8;
            } else if (param === "blood_pressure") {
              const noiseSystolic = Math.floor(Math.random() * 5) - 2;
              const noiseDiastolic = Math.floor(Math.random() * 4) - 2;
              value = `${116 + noiseSystolic}/${74 + noiseDiastolic}`;
              unit = "mmHg";
              originalMessage = `Blood pressure check: ${value} mmHg.`;
              hourOffset = 9;
            } else if (param === "weight") {
              value = Number((75.0 + (Math.random() * 0.4 - 0.2)).toFixed(1));
              unit = "kg";
              originalMessage = `Weight is stable: ${value} kg.`;
              hourOffset = 7;
            } else if (param === "heart_rate") {
              value = 64 + (Math.floor(Math.random() * 5) - 2);
              unit = "bpm";
              originalMessage = `Pulse: ${value} bpm.`;
              hourOffset = 12;
            } else {
              value = Number((36.6 + (Math.random() * 0.2 - 0.1)).toFixed(1));
              unit = "°C";
              originalMessage = `Temp: ${value} C.`;
              hourOffset = 18;
            }
            break;
          }

          case "hypertension": {
            if (param === "blood_pressure") {
              // High blood pressure with fluctuations (145/94 to 158/100)
              const progress = (totalDays - 1 - day) / (totalDays - 1);
              const baseSys = 154 - progress * 4; // Starts very high, fluctuates
              const sysNoise = Math.floor(Math.random() * 9) - 4; // +/- 4
              const baseDia = 97 - progress * 2;
              const diaNoise = Math.floor(Math.random() * 5) - 2; // +/- 2
              value = `${Math.round(baseSys + sysNoise)}/${Math.round(baseDia + diaNoise)}`;
              unit = "mmHg";
              originalMessage = `BP reading: ${value} mmHg. Feeling a minor headache today.`;
              hourOffset = 9;
            } else if (param === "blood_sugar") {
              value = 98 + (Math.floor(Math.random() * 9) - 4);
              unit = "mg/dL";
              originalMessage = `Sugar level is ${value} mg/dL.`;
              hourOffset = 8;
            } else if (param === "weight") {
              value = 71.2;
              unit = "kg";
              originalMessage = `Weight: 71.2 kg.`;
              hourOffset = 7;
            } else if (param === "heart_rate") {
              value = 81 + (Math.floor(Math.random() * 7) - 3);
              unit = "bpm";
              originalMessage = `Heart rate is slightly fast: ${value} bpm.`;
              hourOffset = 12;
            } else {
              value = Number((36.6 + (Math.random() * 0.2 - 0.1)).toFixed(1));
              unit = "°C";
              originalMessage = `Temperature is normal: ${value} C.`;
              hourOffset = 18;
            }
            break;
          }

          case "weight_loss": {
            if (param === "weight") {
              // High (98.4) to lower (93.8) over 14 days
              const progress = (totalDays - 1 - day) / (totalDays - 1); // 0 to 1
              const baseWeight = 98.4 - progress * 4.6; // drops by 4.6kg
              const noise = Number((Math.random() * 0.3 - 0.15).toFixed(1));
              value = Number((baseWeight + noise).toFixed(1));
              unit = "kg";
              originalMessage = `Weighed in this morning: ${value} kg. Satisfied with the progress!`;
              hourOffset = 7;
            } else if (param === "blood_sugar") {
              // Mildly high to excellent fasting sugar level
              const progress = (totalDays - 1 - day) / (totalDays - 1);
              const baseSugar = 105 - progress * 13;
              value = Math.round(baseSugar + (Math.random() * 6 - 3));
              unit = "mg/dL";
              originalMessage = `Blood sugar fasting: ${value} mg/dL.`;
              hourOffset = 8;
            } else if (param === "blood_pressure") {
              // BP improves slightly with weight loss
              const progress = (totalDays - 1 - day) / (totalDays - 1);
              const sys = Math.round(132 - progress * 10 + (Math.random() * 6 - 3));
              const dia = Math.round(84 - progress * 6 + (Math.random() * 4 - 2));
              value = `${sys}/${dia}`;
              unit = "mmHg";
              originalMessage = `BP has dropped to: ${value} mmHg.`;
              hourOffset = 9;
            } else if (param === "heart_rate") {
              value = 68 + (Math.floor(Math.random() * 5) - 2);
              unit = "bpm";
              originalMessage = `Resting heart rate: ${value} bpm.`;
              hourOffset = 12;
            } else {
              value = Number((36.5 + (Math.random() * 0.2 - 0.1)).toFixed(1));
              unit = "°C";
              originalMessage = `Temp check: ${value} C.`;
              hourOffset = 18;
            }
            break;
          }

          case "fever_recovery": {
            if (param === "body_temperature") {
              // High fever (39.5) resolving to normal (36.6)
              let temp = 36.6;
              if (day >= 11) {
                // First 3 days: high fever (days 13, 12, 11)
                temp = 39.4 + (Math.random() * 0.4 - 0.2); // 39.2 to 39.6
                originalMessage = `Urgent: I feel shivering and hot. Fever is ${temp.toFixed(1)} °C.`;
              } else if (day >= 7) {
                // Resolving phase (days 10, 9, 8, 7)
                const progress = (11 - day) / 4; // 0 to 1
                temp = 39.2 - progress * 2.4 + (Math.random() * 0.3 - 0.15); // slides down to 36.8
                originalMessage = `My fever is breaking, temp is down to ${temp.toFixed(1)} °C.`;
              } else {
                // Completely recovered phase
                temp = 36.6 + (Math.random() * 0.3 - 0.15);
                originalMessage = `Feeling completely fine. Body temp is normal at ${temp.toFixed(1)} C.`;
              }
              value = Number(temp.toFixed(1));
              unit = "°C";
              hourOffset = 18; // Evening temp check
            } else if (param === "heart_rate") {
              // Elevated HR during high fever, normal HR during recovery
              let hr = 72;
              if (day >= 11) {
                hr = 102 + Math.floor(Math.random() * 7) - 3;
                originalMessage = `Pulse feels fast: ${hr} bpm.`;
              } else if (day >= 7) {
                const progress = (11 - day) / 4;
                hr = Math.round(102 - progress * 28 + (Math.random() * 6 - 3));
                originalMessage = `Heart rate is slowing down: ${hr} bpm.`;
              } else {
                hr = 70 + Math.floor(Math.random() * 5) - 2;
                originalMessage = `Normal pulse of ${hr} bpm.`;
              }
              value = hr;
              unit = "bpm";
              hourOffset = 12;
            } else if (param === "blood_sugar") {
              value = 98 + (Math.floor(Math.random() * 11) - 5);
              unit = "mg/dL";
              originalMessage = `Glucose: ${value} mg/dL.`;
              hourOffset = 8;
            } else if (param === "blood_pressure") {
              const sys = 118 + Math.floor(Math.random() * 5) - 2;
              const dia = 75 + Math.floor(Math.random() * 4) - 2;
              value = `${sys}/${dia}`;
              unit = "mmHg";
              originalMessage = `BP is stable: ${value} mmHg.`;
              hourOffset = 9;
            } else {
              value = 58.0;
              unit = "kg";
              originalMessage = `Weight: 58.0 kg.`;
              hourOffset = 7;
            }
            break;
          }
        }

        // Compute exact timestamp for this parameter's reading on this specific day
        const recordedAt = new Date(baseDate.getTime());
        recordedAt.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);

        // Generate unique and deterministic message ID to ensure idempotency and schema requirement
        const whatsappMessageId = `msg_${patient.id}_${param}_day${day}`;

        records.push({
          patientId: patient.id,
          parameter: param,
          value,
          unit,
          recordedAt,
          source: "WhatsApp",
          confidence: 0.99,
          originalMessage,
          whatsappMessageId,
        });
      }
    }
  }

  // Sort records in ascending order of recordedAt so they display in chronological order
  return records.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}
