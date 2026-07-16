import React, { useState } from "react";
import { addPatientRecord, type AddRecordPayload } from "../services/patientService";
import "./RecordSubmissionModal.css";

interface RecordSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordSubmissionModal: React.FC<RecordSubmissionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [parameter, setParameter] = useState<string>("blood_sugar");
  const [value, setValue] = useState<string>("");
  const [systolic, setSystolic] = useState<string>("");
  const [diastolic, setDiastolic] = useState<string>("");
  const [recordedAt, setRecordedAt] = useState<string>(() => {
    // Current time in local string format for datetime-local input: YYYY-MM-DDTHH:mm
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string>("");

  if (!isOpen) return null;

  const getUnitForParameter = (param: string) => {
    switch (param) {
      case "blood_sugar": return "mg/dL";
      case "blood_pressure": return "mmHg";
      case "weight": return "kg";
      case "heart_rate": return "bpm";
      case "body_temperature": return "°C";
      default: return "";
    }
  };

  const getLabelForParameter = (param: string) => {
    switch (param) {
      case "blood_sugar": return "Blood Sugar";
      case "blood_pressure": return "Blood Pressure";
      case "weight": return "Weight";
      case "heart_rate": return "Heart Rate";
      case "body_temperature": return "Temperature";
      default: return "";
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (parameter === "blood_pressure") {
      if (!systolic) {
        newErrors.systolic = "Systolic pressure is required.";
      } else {
        const sysNum = Number(systolic);
        if (isNaN(sysNum) || sysNum < 50 || sysNum > 250) {
          newErrors.systolic = "Systolic value must be between 50 and 250 mmHg.";
        }
      }

      if (!diastolic) {
        newErrors.diastolic = "Diastolic pressure is required.";
      } else {
        const diaNum = Number(diastolic);
        if (isNaN(diaNum) || diaNum < 30 || diaNum > 150) {
          newErrors.diastolic = "Diastolic value must be between 30 and 150 mmHg.";
        }
      }
    } else {
      if (!value) {
        newErrors.value = "Measurement value is required.";
      } else {
        const valNum = Number(value);
        if (isNaN(valNum) || valNum <= 0) {
          newErrors.value = "Value must be a positive number.";
        } else {
          if (parameter === "blood_sugar" && (valNum < 10 || valNum > 600)) {
            newErrors.value = "Blood sugar must be between 10 and 600 mg/dL.";
          } else if (parameter === "weight" && (valNum < 10 || valNum > 300)) {
            newErrors.value = "Weight must be between 10 and 300 kg.";
          } else if (parameter === "heart_rate" && (valNum < 30 || valNum > 250)) {
            newErrors.value = "Heart rate must be between 30 and 250 bpm.";
          } else if (parameter === "body_temperature" && (valNum < 30 || valNum > 45)) {
            newErrors.value = "Temperature must be between 30°C and 45°C.";
          }
        }
      }
    }

    if (!recordedAt) {
      newErrors.recordedAt = "Date and time are required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!validate()) return;

    setIsSubmitting(true);

    const submissionValue = parameter === "blood_pressure"
      ? `${systolic.trim()}/${diastolic.trim()}`
      : Number(value);

    const payload: AddRecordPayload = {
      parameter,
      value: submissionValue,
      unit: getUnitForParameter(parameter),
      recordedAt: new Date(recordedAt).toISOString(),
    };

    try {
      const response = await addPatientRecord(payload);
      if (response.success) {
        // Clear form
        setValue("");
        setSystolic("");
        setDiastolic("");
        setErrors({});
        onSuccess();
        onClose();
      } else {
        setGeneralError(response.message || "Failed to submit record.");
      }
    } catch (err: unknown) {
      console.error(err);
      const errorWithResponse = err as { response?: { data?: { message?: string } } };
      setGeneralError(errorWithResponse.response?.data?.message || "A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <h2 id="modal-title">Add New Health Record</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          {generalError && (
            <div className="modal-error-banner" role="alert">
              {generalError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="param-select" className="form-label">Health Metric</label>
            <select
              id="param-select"
              value={parameter}
              onChange={(e) => {
                setParameter(e.target.value);
                setErrors({});
                setGeneralError("");
                setValue("");
                setSystolic("");
                setDiastolic("");
              }}
              className="form-select"
            >
              <option value="blood_sugar">Blood Sugar</option>
              <option value="blood_pressure">Blood Pressure</option>
              <option value="weight">Weight</option>
              <option value="heart_rate">Heart Rate</option>
              <option value="body_temperature">Temperature</option>
            </select>
          </div>

          {parameter === "blood_pressure" ? (
            <div className="form-group">
              <label className="form-label">Blood Pressure Reading (systolic/diastolic)</label>
              <div className="bp-inputs-wrapper">
                <div className="bp-input-field">
                  <input
                    type="number"
                    placeholder="Sys (e.g. 120)"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className={`form-input bp-input ${errors.systolic ? "form-input--error" : ""}`}
                    aria-label="Systolic blood pressure"
                  />
                  <span className="bp-sub-label">Systolic</span>
                </div>
                <span className="bp-separator">/</span>
                <div className="bp-input-field">
                  <input
                    type="number"
                    placeholder="Dia (e.g. 80)"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className={`form-input bp-input ${errors.diastolic ? "form-input--error" : ""}`}
                    aria-label="Diastolic blood pressure"
                  />
                  <span className="bp-sub-label">Diastolic</span>
                </div>
                <span className="unit-badge">{getUnitForParameter(parameter)}</span>
              </div>
              {errors.systolic && <p className="field-error-message">{errors.systolic}</p>}
              {errors.diastolic && <p className="field-error-message">{errors.diastolic}</p>}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="param-value" className="form-label">{getLabelForParameter(parameter)} Value</label>
              <div className="input-with-unit">
                <input
                  id="param-value"
                  type="number"
                  step="any"
                  placeholder={`Enter value (e.g. ${parameter === "body_temperature" ? "36.6" : "75"})`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`form-input ${errors.value ? "form-input--error" : ""}`}
                />
                <span className="unit-badge">{getUnitForParameter(parameter)}</span>
              </div>
              {errors.value && <p className="field-error-message">{errors.value}</p>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="recorded-at" className="form-label">Date & Time of Reading</label>
            <input
              id="recorded-at"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className={`form-input ${errors.recordedAt ? "form-input--error" : ""}`}
              max={new Date().toISOString().slice(0, 16)}
            />
            {errors.recordedAt && <p className="field-error-message">{errors.recordedAt}</p>}
          </div>

          <footer className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Save Record"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
export default RecordSubmissionModal;
