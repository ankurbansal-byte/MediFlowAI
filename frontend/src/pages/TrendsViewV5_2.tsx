import React, { useState, useEffect, useMemo } from "react";
import TrendChart, { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TimelineRecord } from "../components/TimelineItem";
import { formatGlucoseContext, getLocalDateString, formatRecordDateTime } from "../utils/date";
import api from "../api/axios";

// Import project assets naturally to blend into the storytelling
import homeHeroWhatsapp from "../assets/images/home-hero-whatsapp.png";
import doctorDashboard from "../assets/images/doctor-dashboard.png";
import cloudPlatformFlow from "../assets/images/cloud-platform-flow.png";
import healthReportFlow from "../assets/images/health-report-flow.png";

import "./TrendsViewV5_2.css";

interface TrendsViewV5_2Props {
  patientId?: string;
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  trendPeriod: TrendPeriod;
  setTrendPeriod: (period: TrendPeriod) => void;
  isTrendLoading: boolean;
  hasTrendError: boolean;
  trend: TrendRecord[];
  timeline: TimelineRecord[];
  selectedHistoryDate?: string | null;
  setSelectedHistoryDate?: (dateStr: string | null) => void;
}

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v52-editorial-divider-section">
      <div className="v52-editorial-line"></div>
      <p className="v52-editorial-quote-text">
        {text}
      </p>
      <div className="v52-editorial-line"></div>
    </div>
  );
};

const TrendsViewV5_2: React.FC<TrendsViewV5_2Props> = ({
  patientId,
  trends: _trends,
  selectedParameter,
  setSelectedParameter,
  trendPeriod,
  setTrendPeriod,
  isTrendLoading,
  hasTrendError,
  trend,
  timeline,
  selectedHistoryDate,
  setSelectedHistoryDate,
}) => {
  const [glucoseContextFilter, setGlucoseContextFilter] = useState<string>("all");
  const [labObservations, setLabObservations] = useState<any[]>([]);
  const [isLabsLoading, setIsLabsLoading] = useState(false);
  const [hasLabsError, setHasLabsError] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [historyCategory, setHistoryCategory] = useState<string>("all");
  const [historyTimeframe, setHistoryTimeframe] = useState<string>("all");
  const [historyMode, setHistoryMode] = useState<"latest" | "all">("latest");
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({});

  const activeHistoryMode = selectedHistoryDate ? "selected" : historyMode;
  const [visibleGroupsCount, setVisibleGroupsCount] = useState<number>(3);

  // Reset progressive disclosure when search or filter changes
  useEffect(() => {
    setVisibleGroupsCount(3);
  }, [historyCategory, historyTimeframe, selectedHistoryDate, historyMode, searchTerm]);

  useEffect(() => {
    if (patientId) {
      setIsLabsLoading(true);
      setHasLabsError(false);
      api.get(`/patient/lab-observations/${patientId}`)
        .then(res => {
          if (res.data.success) {
            setLabObservations(res.data.observations || []);
          } else {
            setHasLabsError(true);
          }
        })
        .catch(err => {
          console.error("Error fetching lab observations in TrendsViewV5_2:", err);
          setHasLabsError(true);
        })
        .finally(() => {
          setIsLabsLoading(false);
        });
    }
  }, [patientId]);

  // Client-side filtering of unified longitudinal timeline
  const filteredTimeline = useMemo(() => {
    let result = [...timeline];

    // Search query match
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => {
        const paramStr = r.parameter?.replace(/_/g, " ") || "";
        const labelStr = r.displayLabel || "";
        const testStr = r.testName || "";
        const valStr = String(r.value);
        return paramStr.toLowerCase().includes(q) ||
               labelStr.toLowerCase().includes(q) ||
               testStr.toLowerCase().includes(q) ||
               valStr.toLowerCase().includes(q);
      });
    }

    // Timeframe Filter (7, 30, 90 days)
    if (historyTimeframe !== "all") {
      const days = parseInt(historyTimeframe, 10);
      if (!isNaN(days)) {
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        result = result.filter(r => r.recordedAt && new Date(r.recordedAt).getTime() >= limit.getTime());
      }
    }

    // Category Filter
    if (historyCategory !== "all") {
      if (historyCategory === "lab") {
        result = result.filter(r => r.category === "lab_observation");
      } else {
        result = result.filter(r => r.category === "health_reading" && r.parameter === historyCategory);
      }
    }

    return result;
  }, [timeline, historyCategory, historyTimeframe, searchTerm]);

  // Group chronological records by calendar date
  const groupedRecords = useMemo(() => {
    const groups: Record<string, TimelineRecord[]> = {};
    for (const r of filteredTimeline) {
      if (!r.recordedAt) continue;
      const key = getLocalDateString(r.recordedAt);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    }
    for (const key in groups) {
      groups[key].sort((a, b) => {
        const tA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
        const tB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
        if (tA !== tB) {
          return tB - tA;
        }
        const order = { morning: 1, afternoon: 2, evening: 3, night: 4 };
        const valA = order[(a.timeContext || "") as keyof typeof order] || 0;
        const valB = order[(b.timeContext || "") as keyof typeof order] || 0;
        return valB - valA;
      });
    }
    return groups;
  }, [filteredTimeline]);

  const recordDates = useMemo(() => {
    return Object.keys(groupedRecords);
  }, [groupedRecords]);

  // Calendar month management
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedHistoryDate) {
      return new Date(selectedHistoryDate);
    }
    if (timeline.length > 0 && timeline[0].recordedAt) {
      return new Date(timeline[0].recordedAt);
    }
    return new Date();
  });

  useEffect(() => {
    if (selectedHistoryDate) {
      setCurrentMonth(new Date(selectedHistoryDate));
    }
  }, [selectedHistoryDate]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthName = currentMonth.toLocaleString("en-US", { month: "long" });
  const yearNum = currentMonth.getFullYear();

  const toggleRecordExpand = (recId: string) => {
    setExpandedRecordIds(prev => ({
      ...prev,
      [recId]: !prev[recId]
    }));
  };

  const formatRecordTimeOnly = (recordedAt?: string) => {
    if (!recordedAt) return "—";
    const date = new Date(recordedAt);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  // Group records displayed based on date filtering and activeHistoryMode
  const groupedAndFilteredTimeline = useMemo(() => {
    const groups: { dateStr: string; dateObj: Date; records: TimelineRecord[] }[] = [];
    const sortedDates = [...recordDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (const dStr of sortedDates) {
      if (activeHistoryMode === "selected" && selectedHistoryDate && dStr !== selectedHistoryDate) {
        continue;
      }
      const recs = groupedRecords[dStr] || [];
      if (recs.length > 0) {
        groups.push({
          dateStr: dStr,
          dateObj: new Date(recs[0].recordedAt || dStr),
          records: recs
        });
      }
    }

    if (activeHistoryMode === "latest" && groups.length > 0) {
      return [groups[0]];
    }

    return groups;
  }, [recordDates, groupedRecords, selectedHistoryDate, activeHistoryMode]);


  const filteredTrend = useMemo(() => {
    if (selectedParameter !== "blood_sugar" || glucoseContextFilter === "all") {
      return trend;
    }
    return trend.filter(r => r.context === glucoseContextFilter);
  }, [trend, selectedParameter, glucoseContextFilter]);

  const selectedDateRecords = useMemo(() => {
    if (!selectedHistoryDate) return [];
    return groupedRecords[selectedHistoryDate] || [];
  }, [groupedRecords, selectedHistoryDate]);

  // Card list builder matching V5 styling
  const renderV5RecordCard = (group: { dateStr: string; dateObj: Date; records: TimelineRecord[] }) => {
    const dateHeaderStr = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(group.dateObj);

    return (
      <div
        key={group.dateStr}
        className="v52-records-group-card"
        style={{
          background: "var(--v5-bg-white)",
          border: "1.5px solid var(--v5-border-subtle)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--v5-shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {/* Date Group Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1.5px solid #F3ECE2",
          paddingBottom: "12px"
        }}>
          <h3 style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--v5-text-dark)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#F5EAD4",
            padding: "6px 14px",
            borderRadius: "20px"
          }}>
            <span>📅</span> {dateHeaderStr}
          </h3>
          <span style={{ color: "var(--v52-orange)", background: "#FFF0E0", padding: "4px 10px", borderRadius: "12px", fontSize: "10px", fontWeight: 700 }}>
            {group.records.length} {group.records.length === 1 ? "record" : "records"}
          </span>
        </div>

        {/* Inner Records list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {group.records.map((record, rIdx) => {
            const isLab = record.category === "lab_observation";
            const uniqueId = record.id || `${group.dateStr}_${rIdx}_${record.parameter}`;
            const isExpanded = !!expandedRecordIds[uniqueId];
            const displayParam = record.displayLabel || (isLab ? record.testName : record.parameter.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
            const timeStr = record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : formatRecordTimeOnly(record.recordedAt);

            const getParamIcon = (p: string) => {
              const lowP = p.toLowerCase();
              if (lowP.includes("sugar")) return "🩸";
              if (lowP.includes("pressure")) return "🩺";
              if (lowP.includes("rate") || lowP.includes("heart")) return "❤️";
              if (lowP.includes("temp")) return "🌡️";
              if (lowP.includes("weight")) return "⚖️";
              if (lowP.includes("oxygen")) return "🫁";
              return "✦";
            };

            const getParamColorConfig = (p: string) => {
              const lowP = p.toLowerCase();
              if (lowP.includes("sugar")) return { tint: "#FFFBF7", text: "var(--v52-orange)", line: "var(--v52-orange)" };
              if (lowP.includes("pressure")) return { tint: "#F0F9FF", text: "var(--v52-blue)", line: "var(--v52-blue)" };
              if (lowP.includes("rate") || lowP.includes("heart")) return { tint: "#FFF5F5", text: "var(--v52-rose)", line: "var(--v52-rose)" };
              if (lowP.includes("temp")) return { tint: "#FFFDF0", text: "var(--v52-yellow)", line: "var(--v52-yellow)" };
              if (lowP.includes("weight")) return { tint: "#FAF5FF", text: "var(--v52-purple)", line: "var(--v52-purple)" };
              return { tint: "#FAF6F0", text: "var(--v5-text-dark)", line: "var(--v5-text-muted)" };
            };

            const colors = isLab ? { tint: "#F0FDF4", text: "var(--v52-teal)", line: "var(--v52-teal)" } : getParamColorConfig(record.parameter);

            return (
              <div
                key={rIdx}
                className="v52-history-item-row"
                style={{
                  background: colors.tint,
                  border: "1.5px solid var(--v5-border-subtle)",
                  borderLeft: `5px solid ${colors.line}`,
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => toggleRecordExpand(uniqueId)}
              >
                {/* Visual Header Line */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      background: isLab ? "rgba(15,118,110,0.12)" : "rgba(107,100,93,0.12)",
                      color: isLab ? "var(--v52-teal)" : "var(--v5-text-muted)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      letterSpacing: "0.04em"
                    }}>
                      {isLab ? "LAB FINDING" : "ROUTINE VITAL"}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--v5-text-dark)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>{isLab ? "🧪" : getParamIcon(record.parameter)}</span>
                      {displayParam}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--v5-text-muted)" }}>({timeStr})</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--v5-text-dark)" }}>
                      {record.value} <span style={{ fontSize: "12px", fontWeight: 400, opacity: 0.7 }}>{record.unit}</span>
                      {!isLab && record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                        <span style={{
                          fontSize: "10px",
                          background: "#FFF0E0",
                          color: "var(--v52-orange)",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          marginLeft: "6px"
                        }}>
                          {formatGlucoseContext(record.context)}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--v5-text-muted)" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div style={{
                    marginTop: "4px",
                    paddingTop: "12px",
                    borderTop: "1.5px dashed var(--v5-border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    fontSize: "13px",
                    color: "var(--v5-text-dark)"
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Source Pathway</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          💬 {isLab ? "WhatsApp Lab Report" : `${record.source || "WhatsApp Message"}`}
                        </strong>
                      </div>

                      <div>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Extraction Confidence</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                          <div style={{ flex: 1, background: "var(--v5-bg-cream)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{
                              background: "var(--v5-brand-green)",
                              height: "100%",
                              width: isLab ? "100%" : `${Math.round((record.confidence || 0.9) * 100)}%`
                            }}></div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>
                            {isLab ? "100%" : `${Math.round((record.confidence || 0.9) * 100)}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isLab && (record.referenceRangeText || record.flag) && (
                      <div style={{ background: "var(--v5-bg-cream)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--v5-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", display: "block" }}>Reference Range</span>
                          <strong>{record.referenceRangeText || "Normal Standard"}</strong>
                        </div>
                        {record.flag && (
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: record.flag.toLowerCase() === "high" || record.flag.toLowerCase() === "low" ? "#FFE4E6" : "#D1FAE5",
                            color: record.flag.toLowerCase() === "high" || record.flag.toLowerCase() === "low" ? "var(--v52-rose)" : "#065F46"
                          }}>
                            {record.flag}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--v5-text-muted)" }}>
                      <span>System Identity: {record.id || "N/A"}</span>
                      <span>Recorded: {formatRecordDateTime(record.recordedAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="v52-records-canvas">

      {/* COMPACT PREMIUM HERO STYLE */}
      <section className="v52-hero-section">
        <div className="v52-hero-grid">
          <div className="v52-hero-content-column">
            <span className="v52-hero-eyebrow">
              ⚡ Medical Informatics Ecosystem V5.2
            </span>
            <h1 className="v52-hero-title">
              Historical Health Analytics
            </h1>
            <p className="v52-hero-body">
              Seamlessly explore your complete analytical logs, pathological document findings, and physiological readings synchronized automatically from your secure WhatsApp healthcare records channel.
            </p>
            <div className="v52-hero-id-badge" style={{ alignSelf: "flex-start" }}>
              Comprehensive Records Audit
            </div>
          </div>

          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-wrapper" style={{ gridTemplateColumns: "1fr" }}>
              <div className="v52-storytelling-card" style={{ padding: "20px" }}>
                <span className="v52-image-tag" style={{ background: "var(--v52-orange)" }}>Platform Architecture</span>
                <img src={cloudPlatformFlow} alt="MediFlowAI Cloud Pipeline Flow" className="v52-storytelling-image" style={{ height: "140px" }} />
                <p className="v52-image-caption">Secure, direct cloud informatics pipeline updating and indexing routine readings instantly with hospital-grade security boundaries.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Every dataset in health informatics is a pulse of life. Mapping our history is the first step toward reclaiming our vitality.”" />

      {/* SECTION A: GRAPHS / TRENDS BLOCK (MEDICAL BLUE PANEL) */}
      <section className="v52-section-panel v52-bg-trends-panel" aria-labelledby="v52-graphs-heading">
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "40px", alignItems: "start" }}>
          <div>
            <h2 id="v52-graphs-heading" className="v52-panel-heading" style={{ margin: 0 }}>
              📈 Physiological Metrics Trends
            </h2>
            <p className="v52-panel-subtitle" style={{ marginTop: "4px" }}>
              Track chronological trends, statistics, and extreme boundaries computed from structured recordings.
            </p>

            {/* Premium Parameter Selector */}
            <div className="v52-parameter-switcher-row" style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "24px",
              padding: "10px 16px",
              background: "var(--v5-bg-white)",
              border: "1.5px solid var(--v5-border-subtle)",
              borderRadius: "12px",
              boxShadow: "var(--v5-shadow-sm)"
            }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--v5-text-muted)", marginRight: "4px" }}>Select Metric:</span>
              {[
                { id: "blood_sugar", label: "Blood Sugar", icon: "🩸" },
                { id: "blood_pressure", label: "Blood Pressure", icon: "🩺" },
                { id: "heart_rate", label: "Heart Rate", icon: "❤️" },
                { id: "oxygen_saturation", label: "Oxygen", icon: "🫁" },
                { id: "body_temperature", label: "Temperature", icon: "🌡️" },
                { id: "weight", label: "Weight", icon: "⚖️" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParameter(p.id as HealthParameter)}
                  className={`v52-param-tab-btn ${selectedParameter === p.id ? "v52-param-tab-btn--active" : ""}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: selectedParameter === p.id ? "2.5px solid var(--v52-orange)" : "1.5px solid var(--v5-border-subtle)",
                    background: selectedParameter === p.id ? "#FFF0E0" : "var(--v5-bg-white)",
                    color: selectedParameter === p.id ? "var(--v52-orange)" : "var(--v5-text-muted)",
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease"
                  }}
                  type="button"
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            {/* Glucose Context Filter Row */}
            {selectedParameter === "blood_sugar" && (
              <div style={{
                marginTop: "0px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                padding: "10px 16px",
                background: "var(--v5-bg-white)",
                border: "1.5px solid var(--v5-border-subtle)",
                borderRadius: "12px",
                boxShadow: "var(--v5-shadow-sm)"
              }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--v5-text-muted)" }}>Glucose Context:</span>
                {[
                  { id: "all", label: "All Readings" },
                  { id: "fasting", label: "Fasting" },
                  { id: "pre_meal", label: "Pre-meal" },
                  { id: "post_meal", label: "Post-meal" },
                  { id: "random", label: "Random" }
                ].map((ctx) => (
                  <button
                    key={ctx.id}
                    onClick={() => setGlucoseContextFilter(ctx.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: glucoseContextFilter === ctx.id ? "2.5px solid var(--v52-orange)" : "1.5px solid var(--v5-border-subtle)",
                      background: glucoseContextFilter === ctx.id ? "#FFF0E0" : "var(--v5-bg-white)",
                      color: glucoseContextFilter === ctx.id ? "var(--v52-orange)" : "var(--v5-text-muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    type="button"
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: "var(--v5-bg-white)", padding: "12px", borderRadius: "16px", border: "1.5px solid var(--v5-border-subtle)", boxShadow: "var(--v5-shadow-sm)" }}>
              <TrendChart
                hasError={hasTrendError}
                isLoading={isTrendLoading}
                onPeriodChange={setTrendPeriod}
                period={trendPeriod}
                records={filteredTrend}
                parameter={selectedParameter}
              />
            </div>
          </div>

          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-card" style={{ padding: "20px" }}>
              <span className="v52-image-tag" style={{ background: "var(--v52-blue)" }}>Trends Visualizer</span>
              <img src={healthReportFlow} alt="Clinician Analytics Panel" className="v52-storytelling-image" style={{ height: "150px" }} />
              <p className="v52-image-caption" style={{ marginTop: "8px" }}>Unified chronological view allowing quick comparison of vital statistics, aiding clinicians in tracing physiological progress safely.</p>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Precision is the companion of care. When we track our measurements with integrity, we honor the intricate design of our bodies.”" />

      {/* SECTION B: CALENDAR NAVIGATION (SOFT LAVENDER/PURPLE PANEL) */}
      <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="v52-calendar-heading" id="calendar-navigation-section">
        <h2 id="v52-calendar-heading" className="v52-calendar-heading-v52">
          📅 Calendar Navigation Hub
        </h2>
        <p className="v52-panel-subtitle">
          Select any date directly on the calendar grid below to isolate and focus on observations recorded during that exact calendar day.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px", alignItems: "start" }}>
          {/* Left: Compact Calendar redone */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--v5-text-dark)" }}>Navigate Months</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button onClick={handlePrevMonth} style={{ background: "var(--v5-bg-cream)", border: "1px solid var(--v5-border-subtle)", borderRadius: "6px", padding: "4px 10px", fontWeight: "bold", cursor: "pointer" }}>←</button>
                <strong style={{ minWidth: "120px", textAlign: "center", fontSize: "14px", color: "var(--v5-text-dark)" }}>{monthName} {yearNum}</strong>
                <button onClick={handleNextMonth} style={{ background: "var(--v5-bg-cream)", border: "1px solid var(--v5-border-subtle)", borderRadius: "6px", padding: "4px 10px", fontWeight: "bold", cursor: "pointer" }}>→</button>
              </div>
            </div>

            {/* Redesigned calendar grid with smaller heights and cleaner margins */}
            <div className="v52-calendar-grid-header" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", gap: "4px", marginBottom: "6px" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(name => (
                <span key={name} style={{ fontSize: "11px", fontWeight: 700, color: "var(--v5-text-muted)", textTransform: "uppercase" }}>{name}</span>
              ))}
            </div>

            <div className="v52-calendar-grid-days" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
              {calendarDays.map((day, dIdx) => {
                if (!day) return <div key={`empty-${dIdx}`} />;
                const dayStr = getLocalDateString(day);
                const dayRecords = groupedRecords[dayStr] || [];
                const hasRecords = dayRecords.length > 0;
                const isSelected = selectedHistoryDate === dayStr;

                return (
                  <button
                    key={dayStr}
                    onClick={() => setSelectedHistoryDate && setSelectedHistoryDate(isSelected ? null : dayStr)}
                    className={`calendar-day-btn ${isSelected ? "calendar-day-btn--selected" : ""} ${hasRecords ? "calendar-day-btn--has-records" : ""}`}
                    style={{
                      padding: "8px 2px", // Reduced heights
                      borderRadius: "8px",
                      border: isSelected ? "2.5px solid var(--v52-orange)" : "1.5px solid var(--v5-border-subtle)",
                      background: isSelected ? "#FFF0E0" : (hasRecords ? "rgba(16,185,129,0.12)" : "var(--v5-bg-cream)"),
                      color: isSelected ? "var(--v52-orange)" : "var(--v5-text-dark)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      minHeight: "44px"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 700 }}>{day.getDate()}</span>
                    {hasRecords && (
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#065F46" }}>
                        {dayRecords.length} rec{dayRecords.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedHistoryDate && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", background: "var(--v5-bg-cream)", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", padding: "10px 14px" }}>
                <span style={{ fontSize: "13px", color: "var(--v5-text-dark)" }}>
                  Focused Date: <strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))}</strong>
                </span>
                <button
                  onClick={() => setSelectedHistoryDate && setSelectedHistoryDate(null)}
                  style={{ background: "var(--v5-bg-white)", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Right: Selected Date Records */}
          <div>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "var(--v5-text-dark)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              📋 Isolated Records For Chosen Date
            </h4>
            {selectedHistoryDate ? (
              selectedDateRecords.length === 0 ? (
                <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "32px", borderRadius: "16px", textAlign: "center" }}>
                  <span style={{ fontSize: "2rem" }}>📅</span>
                  <p style={{ color: "var(--v5-text-muted)", marginTop: "10px", fontSize: "14px" }}>No registered vitals logged on this selected date.</p>
                </div>
              ) : (
                renderV5RecordCard({
                  dateStr: selectedHistoryDate,
                  dateObj: new Date(selectedHistoryDate),
                  records: selectedDateRecords
                })
              )
            ) : (
              <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "32px", borderRadius: "16px", textAlign: "center" }}>
                <span style={{ fontSize: "2rem" }}>👈</span>
                <p style={{ color: "var(--v5-text-muted)", marginTop: "10px", fontSize: "14px" }}>Pick a green-highlighted date on the calendar navigation grid to view its focused readings.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION C: COMPLETE HEALTH HISTORY / TIMELINE (WARM ORANGE/CREAM PANEL) */}
      <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="v52-archive-heading" id="complete-history-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
          <div>
            <h2 id="v52-archive-heading" className="v52-panel-heading" style={{ margin: 0 }}>
              📁 Complete Health History Archive
            </h2>
            <p className="v52-panel-subtitle" style={{ marginTop: "4px", marginBottom: "0px" }}>
              Explore comprehensive physiological signals and structured records, or utilize dynamic filters below to locate specific vitals.
            </p>
          </div>
        </div>

        {/* Dynamic Filters Hub inside the section */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "var(--v5-bg-white)",
          border: "1.5px solid var(--v5-border-subtle)",
          borderRadius: "16px",
          padding: "18px",
          boxShadow: "var(--v5-shadow-sm)",
          marginBottom: "28px"
        }}>
          {/* Search bar input */}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Search by vitals, laboratory test name, values or context..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                borderRadius: "8px",
                border: "1.5px solid var(--v5-border-subtle)",
                background: "var(--v5-bg-cream)",
                fontSize: "14px",
                color: "var(--v5-text-dark)",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            <span style={{ position: "absolute", left: "12px", top: "10px", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--v5-text-muted)", textTransform: "uppercase" }}>Vitals Category:</span>
            {[
              { id: "all", label: "All Records" },
              { id: "blood_pressure", label: "Blood Pressure" },
              { id: "blood_sugar", label: "Blood Sugar" },
              { id: "heart_rate", label: "Heart Rate" },
              { id: "oxygen_saturation", label: "Oxygen" },
              { id: "body_temperature", label: "Temperature" },
              { id: "weight", label: "Weight" },
              { id: "lab", label: "Lab Results" }
            ].map(cat => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                type="button"
                onClick={() => setHistoryCategory(cat.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: historyCategory === cat.id ? "2.5px solid var(--v52-orange)" : "1.5px solid var(--v5-border-subtle)",
                  background: historyCategory === cat.id ? "#FFF0E0" : "var(--v5-bg-white)",
                  color: historyCategory === cat.id ? "var(--v52-orange)" : "var(--v5-text-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Timeframe Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--v5-text-muted)", textTransform: "uppercase" }}>Timeframe Preset:</span>
            {[
              { id: "all", label: "All Timeline" },
              { id: "7", label: "7 Days" },
              { id: "30", label: "30 Days" },
              { id: "90", label: "90 Days" }
            ].map(tf => (
              <button
                key={tf.id}
                id={`tf-filter-${tf.id}`}
                type="button"
                onClick={() => setHistoryTimeframe(tf.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: historyTimeframe === tf.id ? "2.5px solid var(--v52-orange)" : "1.5px solid var(--v5-border-subtle)",
                  background: historyTimeframe === tf.id ? "#FFF0E0" : "var(--v5-bg-white)",
                  color: historyTimeframe === tf.id ? "var(--v52-orange)" : "var(--v5-text-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer"
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "40px", borderRadius: "16px", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>📁</span>
            <p style={{ color: "var(--v5-text-muted)", marginTop: "10px" }}>No physiological records available yet inside your timeline archive.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "40px", alignItems: "start" }}>
            <div>
              {selectedHistoryDate ? (
                <div style={{ background: "var(--v5-bg-white)", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--v5-text-dark)" }}>Currently focusing on <strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))}</strong> inside the calendar hub above.</p>
                  <button
                    onClick={() => {
                      if (setSelectedHistoryDate) setSelectedHistoryDate(null);
                      setHistoryMode("latest");
                    }}
                    style={{ background: "var(--v52-orange)", color: "var(--v5-bg-white)", padding: "10px 20px", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", marginTop: "12px", cursor: "pointer" }}
                  >
                    Return to Full Archive
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {groupedAndFilteredTimeline.length === 0 ? (
                    <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "40px", borderRadius: "16px", textAlign: "center" }}>
                      <span style={{ fontSize: "2rem" }}>🔍</span>
                      <p style={{ color: "var(--v5-text-muted)", marginTop: "10px", fontSize: "14px" }}>No historical records match your search query or filters.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {groupedAndFilteredTimeline.slice(0, visibleGroupsCount).map(group => renderV5RecordCard(group))}
                      </div>

                      {/* Progressive disclosure controls */}
                      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "12px" }}>
                        {activeHistoryMode === "latest" && (
                          <button
                            type="button"
                            onClick={() => setHistoryMode("all")}
                            style={{
                              padding: "10px 20px",
                              borderRadius: "8px",
                              border: "none",
                              background: "var(--v52-orange)",
                              color: "var(--v5-bg-white)",
                              fontWeight: 700,
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            Show all records
                          </button>
                        )}

                        {activeHistoryMode === "all" && (
                          <>
                            {visibleGroupsCount < groupedAndFilteredTimeline.length && (
                              <button
                                type="button"
                                onClick={() => setVisibleGroupsCount(prev => prev + 5)}
                                style={{
                                  padding: "10px 20px",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--v5-border-subtle)",
                                  background: "var(--v5-bg-white)",
                                  color: "var(--v5-text-dark)",
                                  fontWeight: 700,
                                  fontSize: "13px",
                                  cursor: "pointer",
                                }}
                              >
                                View more records
                              </button>
                            )}
                            {visibleGroupsCount > 3 && (
                              <button
                                type="button"
                                onClick={() => setVisibleGroupsCount(3)}
                                style={{
                                  padding: "10px 20px",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--v5-border-subtle)",
                                  background: "var(--v5-bg-white)",
                                  color: "var(--v5-text-muted)",
                                  fontWeight: 700,
                                  fontSize: "13px",
                                  cursor: "pointer"
                                }}
                              >
                                Show less
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setHistoryMode("latest")}
                              style={{
                                padding: "10px 20px",
                                borderRadius: "8px",
                                border: "1.5px solid var(--v5-border-subtle)",
                                background: "var(--v5-bg-white)",
                                color: "var(--v5-text-dark)",
                                fontWeight: 700,
                                fontSize: "13px",
                                cursor: "pointer"
                              }}
                            >
                              Back to latest
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="v52-hero-visual-column">
              <div className="v52-storytelling-card" style={{ padding: "20px" }}>
                <span className="v52-image-tag" style={{ background: "var(--v52-orange)" }}>Document Extraction</span>
                <img src={homeHeroWhatsapp} alt="Cloud Medical Analytics Diagram" className="v52-storytelling-image" style={{ height: "150px" }} />
                <p className="v52-image-caption" style={{ marginTop: "8px" }}>MediFlowAI clinical parser scans raw conversational context line-by-line, matching explicit parameters and validating safety thresholds automatically.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION D: STANDALONE LABORATORY RESULTS (SOFT GREEN PANEL) */}
      <EditorialTransition text="“The patterns of the past illuminate the pathway to future wellness. Every vital logged is an investment in longevity.”" />

      <section className="v52-section-panel v52-bg-labs-panel" aria-labelledby="v52-lab-results-heading">
        <h2 id="v52-lab-results-heading" className="v52-panel-heading">
          🧪 Clinical Laboratory Results
        </h2>
        <p className="v52-panel-subtitle">
          Highly secure structured observations parsed from medical pathology laboratory report documents shared on WhatsApp.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px", alignItems: "start" }}>
          <div>
            {isLabsLoading ? (
              <p style={{ fontStyle: "italic", color: "var(--v5-text-muted)", fontSize: "14px" }}>Loading laboratory observations...</p>
            ) : hasLabsError ? (
              <p style={{ color: "var(--v52-rose)", fontSize: "14px", fontWeight: 600 }}>Failed to retrieve laboratory records.</p>
            ) : labObservations.length === 0 ? (
              <div style={{ border: "1.5px dashed var(--v5-border-subtle)", borderRadius: "16px", padding: "32px", textAlign: "center", background: "var(--v5-bg-white)" }}>
                <span style={{ fontSize: "1.5rem" }}>🔬</span>
                <p style={{ color: "var(--v5-text-muted)", marginTop: "10px", fontSize: "14px" }}>No laboratory records identified inside your records archive.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {labObservations.map((obs, idx) => {
                  const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

                  return (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--v5-bg-white)",
                      border: "1.5px solid var(--v5-border-subtle)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      boxShadow: "var(--v5-shadow-sm)"
                    }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 500, display: "block" }}>
                          {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <strong style={{ fontSize: "14px", color: "var(--v5-text-dark)" }}>{obs.testName}</strong>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div>
                          <strong style={{ fontSize: "15px", color: "var(--v5-text-dark)" }}>
                            {obs.value} <span style={{ fontSize: "12px", opacity: 0.7, fontWeight: 400 }}>{obs.unit}</span>
                          </strong>
                        </div>
                        {obs.flag && (
                          <span className={`v52-labs-flag-pill ${isAbnormal ? "high" : "normal"}`}>
                            {obs.flag}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-card" style={{ padding: "20px" }}>
              <span className="v52-image-tag" style={{ background: "var(--v52-teal)" }}>Clinical Dashboard</span>
              <img src={doctorDashboard} alt="Clinician Analytics Panel" className="v52-storytelling-image" style={{ height: "150px" }} />
              <p className="v52-image-caption" style={{ marginTop: "8px" }}>Secure visual telemetry dashboard synchronizing laboratory datasets seamlessly with clinical providers for quick health auditing.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default TrendsViewV5_2;
