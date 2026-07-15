import { useState, useEffect } from "react";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { getPatientTrend } from "../services/patientService";

export const useTrendData = (selectedPatientId: string) => {
  const [trend, setTrend] = useState<TrendRecord[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(30);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [hasTrendError, setHasTrendError] = useState(false);

  useEffect(() => {
    if (!selectedPatientId) return;

    let isCurrentRequest = true;

    const loadTrend = async () => {
      setTrend([]);
      setHasTrendError(false);
      setIsTrendLoading(true);

      try {
        const data = await getPatientTrend(selectedPatientId, "blood_sugar", trendPeriod);
        if (isCurrentRequest) setTrend(Array.isArray(data.records) ? data.records : []);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasTrendError(true);
      } finally {
        if (isCurrentRequest) setIsTrendLoading(false);
      }
    };

    loadTrend();
    return () => { isCurrentRequest = false; };
  }, [selectedPatientId, trendPeriod]);

  return {
    trend,
    trendPeriod,
    setTrendPeriod,
    isTrendLoading,
    hasTrendError,
  };
};
