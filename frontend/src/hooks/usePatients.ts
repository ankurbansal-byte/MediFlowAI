import { useState, useEffect } from "react";
import { type PatientOption } from "../components/PatientSelector";
import { getPatients } from "../services/patientService";

export const usePatients = () => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [hasPatientsError, setHasPatientsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await getPatients();
        const availablePatients = Array.isArray(data.patients) ? data.patients : [];
        setPatients(availablePatients);
        // Only set initial patient ID if it's not already set to prevent resetting selected patients
        setSelectedPatientId((prev) => prev || (availablePatients[0]?.patientId ?? ""));
      } catch (error) {
        console.error(error);
        setHasPatientsError(true);
      } finally {
        setIsPatientsLoading(false);
      }
    };

    loadPatients();
  }, [refreshKey]);

  return {
    patients,
    selectedPatientId,
    setSelectedPatientId,
    isPatientsLoading,
    hasPatientsError,
    refetch,
  };
};
