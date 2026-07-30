import React, { useState, useEffect, useMemo } from "react";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TimelineRecord } from "../components/TimelineItem";
import { formatGlucoseContext, getLocalDateString, formatRecordDateTime } from "../utils/date";
import api from "../api/axios";

interface TrendsViewV5Props {
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
    <div className="v5-editorial-transition" style={{ padding: "32px 0" }}>
      <div className="v5-editorial-divider">
        <div className="v5-editorial-line"></div>
        <span className="v5-editorial-icon">✦</span>
        <span className="v5-editorial-badge">HISTORY</span>
        <span className="v5-editorial-icon">✦</span>
        <div className="v5-editorial-line"></div>
      </div>
      <p className="v5-editorial-text" style={{ fontSize: "16px", maxWidth: "500px" }}>
        {text}
      </p>
    </div>
  );
};

const TrendsViewV5: React.FC<TrendsViewV5Props> = ({
  patientId,
  trends: _trends,
  selectedParameter: _selectedParameter,
  setSelectedParameter: _setSelectedParameter,
  trendPeriod: _trendPeriod,
  setTrendPeriod: _setTrendPeriod,
  isTrendLoading: _isTrendLoading,
  hasTrendError: _hasTrendError,
  trend: _trend,
  timeline,
  selectedHistoryDate,
  setSelectedHistoryDate,
}) => {
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
          console.error("Error fetching lab observations in TrendsViewV5:", err);
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

  // Calendar setup
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
        className="v5-history-group-card"
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
          borderBottom: "1.5px solid var(--v5-bg-cream)",
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
            background: "var(--v5-bg-cream)",
            padding: "6px 14px",
            borderRadius: "20px"
          }}>
            <span>📅</span> {dateHeaderStr}
          </h3>
          <span className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", background: "#FFF0E0", padding: "4px 10px", borderRadius: "12px", fontSize: "10px" }}>
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
              if (lowP.includes("sugar")) return { tint: "#FFFBF7", text: "var(--v5-brand-orange)", line: "var(--v5-brand-orange)" };
              if (lowP.includes("pressure")) return { tint: "#F0F9FF", text: "var(--v5-brand-aqua)", line: "var(--v5-brand-aqua)" };
              if (lowP.includes("rate") || lowP.includes("heart")) return { tint: "#FFF5F5", text: "var(--v5-brand-coral)", line: "var(--v5-brand-coral)" };
              if (lowP.includes("temp")) return { tint: "#FFFDF0", text: "var(--v5-brand-amber)", line: "var(--v5-brand-amber)" };
              if (lowP.includes("weight")) return { tint: "#FAF5FF", text: "var(--v5-brand-purple)", line: "var(--v5-brand-purple)" };
              return { tint: "#FAF6F0", text: "var(--v5-text-dark)", line: "var(--v5-text-muted)" };
            };

            const colors = isLab ? { tint: "#FFFDF6", text: "var(--v5-brand-amber)", line: "var(--v5-brand-amber)" } : getParamColorConfig(record.parameter);

            return (
              <div
                key={rIdx}
                className="v5-history-item-row"
                style={{
                  background: colors.tint,
                  border: "1.5px solid var(--v5-border-subtle)",
                  borderLeft: `4px solid ${colors.line}`,
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
                      background: isLab ? "rgba(217,119,6,0.12)" : "rgba(107,100,93,0.12)",
                      color: isLab ? "var(--v5-brand-amber)" : "var(--v5-text-muted)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      letterSpacing: "0.04em"
                    }}>
                      {isLab ? "LAB FINDING" : "ROUTINE VITAL"}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--v5-text-dark)", display: "flex", alignItems: "center", gap: "6px" }}>
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
                          color: "var(--v5-brand-orange)",
                          fontWeight: 600,
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
                            color: record.flag.toLowerCase() === "high" || record.flag.toLowerCase() === "low" ? "var(--v5-brand-coral)" : "#065F46"
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
    <div className="dashboard--v5 v5-mediflow-pattern" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 24px" }}>

      {/* Header section matching Home V5 style */}
      <div className="v5-hero-wrapper" style={{ background: "#F3ECE2" }}>
        <div className="v5-hero" style={{ padding: "32px" }}>
          <p className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", margin: 0 }}>📊 Health Records Dashboard</p>
          <h1 className="v5-display" style={{ fontSize: "28px", margin: "6px 0 4px 0" }}>Historical Health Analytics</h1>
          <p className="v5-body" style={{ color: "var(--v5-text-muted)", margin: 0 }}>
            Browse, search, and navigate your complete medical observations, routine readings, and verified laboratory outcomes.
          </p>
        </div>
      </div>

      <EditorialTransition text="“Your historical records empower better healthcare choices tomorrow.”" />

      {/* Search and Filters Hub */}
      <section aria-labelledby="v5-search-filter-heading">
        <h2 id="v5-search-filter-heading" className="v5-section-heading" style={{ fontSize: "18px", marginBottom: "16px" }}>
          🔍 Search & Dynamic Filters
        </h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "var(--v5-bg-white)",
          border: "1.5px solid var(--v5-border-subtle)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "var(--v5-shadow-sm)"
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
                padding: "12px 16px 12px 40px",
                borderRadius: "8px",
                border: "1.5px solid var(--v5-border-subtle)",
                background: "var(--v5-bg-cream)",
                fontSize: "14px",
                color: "var(--v5-text-dark)",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            <span style={{ position: "absolute", left: "14px", top: "12px", fontSize: "16px", pointerEvents: "none" }}>🔍</span>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="v5-eyebrow" style={{ marginRight: "4px" }}>Vitals Category:</span>
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
                type="button"
                onClick={() => setHistoryCategory(cat.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: historyCategory === cat.id ? "2.5px solid var(--v5-brand-orange)" : "1.5px solid var(--v5-border-subtle)",
                  background: historyCategory === cat.id ? "#FFF0E0" : "var(--v5-bg-white)",
                  color: historyCategory === cat.id ? "var(--v5-brand-orange)" : "var(--v5-text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Timeframe Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="v5-eyebrow" style={{ marginRight: "4px" }}>Recorded Timeframe:</span>
            {[
              { id: "all", label: "All Timeline" },
              { id: "7", label: "7 Days" },
              { id: "30", label: "30 Days" },
              { id: "90", label: "90 Days" }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setHistoryTimeframe(tf.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: historyTimeframe === tf.id ? "2.5px solid var(--v5-brand-orange)" : "1.5px solid var(--v5-border-subtle)",
                  background: historyTimeframe === tf.id ? "#FFF0E0" : "var(--v5-bg-white)",
                  color: historyTimeframe === tf.id ? "var(--v5-brand-orange)" : "var(--v5-text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {cat_map_tf_label(tf.label)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar Navigation widget */}
      <section aria-labelledby="v5-calendar-heading">
        <div style={{
          background: "var(--v5-bg-white)",
          border: "1.5px solid var(--v5-border-subtle)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--v5-shadow-sm)"
        }}>
          <h2 id="v5-calendar-heading" className="v5-section-heading" style={{ fontSize: "18px", borderBottom: "1.5px solid var(--v5-bg-cream)", paddingBottom: "12px", marginBottom: "16px" }}>
            📅 Interactive Calendar Navigation
          </h2>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span className="v5-body" style={{ fontWeight: 600 }}>Filter records by picking a custom date</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={handlePrevMonth} style={{ background: "var(--v5-bg-cream)", border: "1px solid var(--v5-border-subtle)", borderRadius: "6px", padding: "4px 10px", fontWeight: "bold", cursor: "pointer" }}>←</button>
              <span className="v5-body" style={{ fontWeight: 600, minWidth: "120px", textAlign: "center" }}>{monthName} {yearNum}</span>
              <button onClick={handleNextMonth} style={{ background: "var(--v5-bg-cream)", border: "1px solid var(--v5-border-subtle)", borderRadius: "6px", padding: "4px 10px", fontWeight: "bold", cursor: "pointer" }}>→</button>
            </div>
          </div>

          <div className="calendar-grid-header" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", gap: "6px", marginBottom: "8px" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(name => (
              <span key={name} className="v5-eyebrow" style={{ fontSize: "10px" }}>{name}</span>
            ))}
          </div>

          <div className="calendar-grid-days" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
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
                  style={{
                    padding: "10px 4px",
                    borderRadius: "8px",
                    border: isSelected ? "2.5px solid var(--v5-brand-orange)" : "1.5px solid var(--v5-border-subtle)",
                    background: isSelected ? "#FFF0E0" : (hasRecords ? "var(--v5-brand-green-light)" : "var(--v5-bg-cream)"),
                    color: isSelected ? "var(--v5-brand-orange)" : "var(--v5-text-dark)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px"
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{day.getDate()}</span>
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
              <span className="v5-body" style={{ fontSize: "13px" }}>
                🎯 Selected Date Focus: <strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))}</strong>
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
      </section>

      {/* Selected Date Focus Block */}
      {selectedHistoryDate && (
        <section aria-labelledby="v5-focused-records">
          <h2 id="v5-focused-records" className="v5-section-heading" style={{ fontSize: "18px" }}>
            📋 Focused Health Records
          </h2>
          {selectedDateRecords.length === 0 ? (
            <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "40px", borderRadius: "16px", textAlign: "center" }}>
              <span style={{ fontSize: "2rem" }}>📅</span>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)", marginTop: "10px" }}>No health observations found for this selected calendar date.</p>
            </div>
          ) : (
            renderV5RecordCard({
              dateStr: selectedHistoryDate,
              dateObj: new Date(selectedHistoryDate),
              records: selectedDateRecords
            })
          )}
        </section>
      )}

      {/* Complete Health History Section */}
      <section aria-labelledby="v5-complete-history-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
          <div>
            <h2 id="v5-complete-history-heading" className="v5-section-heading" style={{ fontSize: "18px", margin: 0 }}>
              📁 Complete Health Archive
            </h2>
            <span style={{ fontSize: "11px", fontWeight: 700, background: "#FFF0E0", color: "var(--v5-brand-orange)", padding: "3px 8px", borderRadius: "4px", display: "inline-block", marginTop: "6px", textTransform: "uppercase" }}>
              {activeHistoryMode === "latest" ? "Showing Latest Groups" : activeHistoryMode === "all" ? "Showing All Groups" : "Focused Selected Date"}
            </span>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "40px", borderRadius: "16px", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>📁</span>
            <p className="v5-body" style={{ color: "var(--v5-text-muted)", marginTop: "10px" }}>No physiological records available yet inside your timeline archive.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {selectedHistoryDate ? (
              <div style={{ background: "var(--v5-bg-white)", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
                <p className="v5-body">Currently focusing on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))} inside the calendar block above.</p>
                <button
                  onClick={() => {
                    if (setSelectedHistoryDate) setSelectedHistoryDate(null);
                    setHistoryMode("latest");
                  }}
                  style={{ background: "var(--v5-brand-orange)", color: "var(--v5-bg-white)", padding: "8px 16px", border: "none", borderRadius: "8px", fontWeight: 600, marginTop: "12px", cursor: "pointer" }}
                >
                  Return to Archive
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {groupedAndFilteredTimeline.length === 0 ? (
                  <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", padding: "40px", borderRadius: "16px", textAlign: "center" }}>
                    <span style={{ fontSize: "2rem" }}>🔍</span>
                    <p className="v5-body" style={{ color: "var(--v5-text-muted)", marginTop: "10px" }}>No historical records match your search query or filters.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {groupedAndFilteredTimeline.slice(0, visibleGroupsCount).map(group => renderV5RecordCard(group))}
                    </div>

                    {/* Show All & Progressive disclosure buttons */}
                    <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "12px" }}>
                      {activeHistoryMode === "latest" && (
                        <button
                          type="button"
                          onClick={() => setHistoryMode("all")}
                          style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "none",
                            background: "var(--v5-brand-orange)",
                            color: "var(--v5-bg-white)",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
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
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
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
                                fontWeight: 600,
                                fontSize: "14px",
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
                              fontWeight: 600,
                              fontSize: "14px",
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
        )}
      </section>

      {/* Laboratory Results V5 section */}
      <section aria-labelledby="v5-lab-results-heading">
        <div style={{
          background: "var(--v5-bg-white)",
          border: "1.5px solid var(--v5-border-subtle)",
          borderLeft: "5px solid var(--v5-brand-amber)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--v5-shadow-sm)"
        }}>
          <h2 id="v5-lab-results-heading" className="v5-section-heading" style={{ fontSize: "18px", borderBottom: "1.5px solid var(--v5-bg-cream)", paddingBottom: "12px", marginBottom: "16px" }}>
            🧪 Standalone Laboratory Results
          </h2>

          {isLabsLoading ? (
            <p className="v5-body" style={{ fontStyle: "italic", color: "var(--v5-text-muted)" }}>Loading laboratory observations...</p>
          ) : hasLabsError ? (
            <p className="v5-body" style={{ color: "var(--v5-brand-coral)" }}>Failed to retrieve laboratory records.</p>
          ) : labObservations.length === 0 ? (
            <div style={{ border: "1.5px dashed var(--v5-border-subtle)", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
              <span style={{ fontSize: "1.5rem" }}>🔬</span>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)", marginTop: "6px" }}>No laboratory outcomes identified inside your records archive.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {labObservations.map((obs, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--v5-bg-cream)",
                  border: "1.5px solid var(--v5-border-subtle)",
                  borderRadius: "12px",
                  padding: "16px 20px"
                }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 500, display: "block" }}>
                      {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString()}
                    </span>
                    <span className="v5-body" style={{ fontWeight: 600 }}>{obs.testName}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="v5-body" style={{ fontWeight: 600 }}>
                      {obs.value} <span style={{ fontSize: "12px", opacity: 0.7 }}>{obs.unit}</span>
                    </span>
                    {obs.flag && (
                      <span style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low" ? "var(--v5-brand-coral)" : "#065F46"
                      }}>
                        [{obs.flag}]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

// Simple helper function to clean mapping and labels
function cat_map_tf_label(tf: string): string {
  if (tf === "All Timeline") return "All Timeline";
  return tf;
}

export default TrendsViewV5;
