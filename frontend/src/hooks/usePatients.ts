import { useState, useEffect } from "react";
import { type PatientOption } from "../components/PatientSelector";
import { getPatients } from "../services/patientService";

export const usePatients = () => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [hasPatientsError, setHasPatientsError] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await getPatients();
        const availablePatients = Array.isArray(data.patients) ? data.patients : [];
        setPatients(availablePatients);
        setSelectedPatientId(availablePatients[0]?.patientId ?? "");
      } catch (error) {
        console.error(error);
        setHasPatientsError(true);
      } finally {
        setIsPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  return {
    patients,
    selectedPatientId,
    setSelectedPatientId,
    isPatientsLoading,
    hasPatientsError,
  };
};
