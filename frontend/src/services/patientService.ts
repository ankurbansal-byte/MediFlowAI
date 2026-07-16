import api from "../api/axios";
import { type PatientOption } from "../components/PatientSelector";
import { type TimelineRecord } from "../components/TimelineItem";
import { type TrendRecord } from "../components/TrendChart";

export type Measurement = { value?: string | number; unit?: string };
export type PatientSummaryMap = Record<string, Measurement | undefined>;

export interface PatientsResponse {
  patients: PatientOption[];
}

export interface PatientSummaryResponse {
  summary: PatientSummaryMap;
}

export interface PatientTimelineResponse {
  records: TimelineRecord[];
}

export interface PatientTrendResponse {
  records: TrendRecord[];
}

export const getPatientSummary = async (patientId: string): Promise<PatientSummaryResponse> => {
  const response = await api.get<PatientSummaryResponse>(
    `/patient/summary/${patientId}`
  );

  return response.data;
};

export interface AddRecordPayload {
  parameter: string;
  value: string | number;
  unit: string;
  recordedAt?: string;
}

export interface AddRecordResponse {
  success: boolean;
  message: string;
  record: {
    patientId: string;
    parameter: string;
    value: string | number;
    unit: string;
    recordedAt: string;
    source: string;
    confidence: number;
    originalMessage: string;
    whatsappMessageId: string;
  };
}

export const addPatientRecord = async (payload: AddRecordPayload): Promise<AddRecordResponse> => {
  const response = await api.post<AddRecordResponse>("/patient/record", payload);
  return response.data;
};

export const getPatientTimeline = async (patientId: string): Promise<PatientTimelineResponse> => {
  const response = await api.get<PatientTimelineResponse>(
    `/patient/timeline/${patientId}`
  );

  return response.data;
};

export const getPatients = async (): Promise<PatientsResponse> => {
  const response = await api.get<PatientsResponse>("/patient");

  return response.data;
};

export const getPatientTrend = async (
  patientId: string,
  parameter: string,
  days: number,
): Promise<PatientTrendResponse> => {
  const response = await api.get<PatientTrendResponse>(
    `/patient/trend/${patientId}/${encodeURIComponent(parameter)}?days=${days}`,
  );

  return response.data;
};
