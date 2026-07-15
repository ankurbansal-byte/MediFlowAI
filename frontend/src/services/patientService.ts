import api from "../api/axios";

export const getPatientSummary = async (patientId: string) => {
  const response = await api.get(
    `/patient/summary/${patientId}`
  );

  return response.data;
};

export const getPatientTimeline = async (patientId: string) => {
  const response = await api.get(
    `/patient/timeline/${patientId}`
  );

  return response.data;
};

export const getPatients = async () => {
  const response = await api.get("/patient");

  return response.data;
};

export const getPatientTrend = async (
  patientId: string,
  parameter: string,
  days: number,
) => {
  const response = await api.get(
    `/patient/trend/${patientId}/${encodeURIComponent(parameter)}?days=${days}`,
  );

  return response.data;
};
