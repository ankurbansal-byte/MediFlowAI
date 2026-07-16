import { useState, useEffect } from "react";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { getPatientTrend } from "../services/patientService";

export type HealthParameter = "blood_sugar" | "blood_pressure" | "weight" | "heart_rate" | "body_temperature";

export const useTrendData = (selectedPatientId: string) => {
  const [trends, setTrends] = useState<Record<HealthParameter, TrendRecord[]>>({
    blood_sugar: [],
    blood_pressure: [],
    weight: [],
    heart_rate: [],
    body_temperature: [],
  });
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(30);
  const [selectedParameter, setSelectedParameter] = useState<HealthParameter>("blood_sugar");
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [hasTrendError, setHasTrendError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    if (!selectedPatientId) return;

    let isCurrentRequest = true;

    const loadAllTrends = async () => {
      setHasTrendError(false);
      setIsTrendLoading(true);

      try {
        const parameters: HealthParameter[] = [
          "blood_sugar",
          "blood_pressure",
          "weight",
          "heart_rate",
          "body_temperature",
        ];

        const results = await Promise.all(
          parameters.map((param) => getPatientTrend(selectedPatientId, param, trendPeriod))
        );

        if (isCurrentRequest) {
          const newTrends = {} as Record<HealthParameter, TrendRecord[]>;
          parameters.forEach((param, index) => {
            const records = results[index]?.records;
            newTrends[param] = Array.isArray(records) ? records : [];
          });
          setTrends(newTrends);
        }
      } catch (error) {
        console.error("Error loading multi-parameter trend data:", error);
        if (isCurrentRequest) setHasTrendError(true);
      } finally {
        if (isCurrentRequest) setIsTrendLoading(false);
      }
    };

    loadAllTrends();
    return () => {
      isCurrentRequest = false;
    };
  }, [selectedPatientId, trendPeriod, refreshKey]);

  return {
    trends,
    trend: trends[selectedParameter], // backward-compatibility for single parameter
    trendPeriod,
    setTrendPeriod,
    selectedParameter,
    setSelectedParameter,
    isTrendLoading,
    hasTrendError,
    refetch,
  };
};
