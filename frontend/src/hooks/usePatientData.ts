import { useState, useEffect } from "react";
import { type TimelineRecord } from "../components/TimelineItem";
import { type PatientSummaryMap, getPatientSummary, getPatientTimeline } from "../services/patientService";
import { type TimelineFilterValue } from "../components/TimelineFilter";

export const usePatientData = (selectedPatientId: string) => {
  const [summary, setSummary] = useState<PatientSummaryMap | null>(null);
  const [timeline, setTimeline] = useState<TimelineRecord[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterValue>("all");
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [hasSummaryError, setHasSummaryError] = useState(false);
  const [hasTimelineError, setHasTimelineError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    if (!selectedPatientId) return;

    let isCurrentRequest = true;

    const loadPatientData = async () => {
      setSummary(null);
      setTimeline([]);
      setTimelineFilter("all");
      setHasSummaryError(false);
      setHasTimelineError(false);
      setIsTimelineLoading(true);

      try {
        const data = await getPatientSummary(selectedPatientId);
        if (isCurrentRequest) setSummary(data.summary);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasSummaryError(true);
      }

      try {
        const data = await getPatientTimeline(selectedPatientId);
        if (isCurrentRequest) setTimeline(Array.isArray(data.records) ? data.records : []);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasTimelineError(true);
      } finally {
        if (isCurrentRequest) setIsTimelineLoading(false);
      }
    };

    loadPatientData();
    return () => { isCurrentRequest = false; };
  }, [selectedPatientId, refreshKey]);

  return {
    summary,
    timeline,
    timelineFilter,
    setTimelineFilter,
    isTimelineLoading,
    hasSummaryError,
    hasTimelineError,
    refetch,
  };
};
