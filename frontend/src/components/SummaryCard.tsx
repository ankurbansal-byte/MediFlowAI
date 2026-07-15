import { type ParameterStats } from "../utils/stats";

type SummaryCardProps = {
  label: string;
  stats: ParameterStats;
  icon: string;
  accent: "blue" | "rose" | "violet" | "orange" | "teal";
  isSelected: boolean;
  onClick: () => void;
};

const SummaryCard = ({ label, stats, icon, accent, isSelected, onClick }: SummaryCardProps) => {
  const getTrendIcon = (direction: ParameterStats["trendDirection"]) => {
    switch (direction) {
      case "Rising":
        return "↗";
      case "Falling":
        return "↘";
      case "Stable":
        return "→";
      default:
        return "";
    }
  };

  const getTrendColor = (direction: ParameterStats["trendDirection"]) => {
    switch (direction) {
      case "Rising":
        return "#c84d64"; // rose/alert
      case "Falling":
        return "#178f80"; // teal/stable
      case "Stable":
        return "#52627d"; // muted
      default:
        return "var(--navy)";
    }
  };

  return (
    <button
      className={`summary-card summary-card--clickable ${isSelected ? "summary-card--selected" : ""}`}
      onClick={onClick}
      type="button"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        font: "inherit",
        border: isSelected ? "2px solid #238b82" : "1px solid var(--line)",
        padding: "16px",
        borderRadius: "14px",
        background: isSelected ? "#f0fdfa" : "var(--surface)",
        transition: "all 0.2s ease",
        cursor: "pointer",
        outline: "none",
        boxShadow: isSelected ? "0 4px 12px rgba(35, 139, 130, 0.15)" : "0 8px 22px rgba(23, 49, 84, .04)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <p className="summary-card__label" style={{ margin: 0, fontWeight: "700" }}>{label}</p>
        <div className={`summary-card__icon summary-card__icon--${accent}`} aria-hidden="true" style={{ margin: 0, width: "32px", height: "32px", borderRadius: "8px", fontSize: "1rem" }}>
          {icon}
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <p className="summary-card__value" style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "var(--navy)" }}>
          {stats.latest}
          {stats.latest !== "—" && stats.unit ? <span className="summary-card__unit" style={{ fontSize: "0.7em", marginLeft: "4px" }}>{stats.unit}</span> : null}
        </p>
        <p style={{ margin: "2px 0 0 0", fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600" }}>Latest Reading</p>
      </div>

      <div className="summary-card__stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "10px", fontSize: "0.78rem" }}>
        <div>
          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem" }}>Average</span>
          <strong style={{ color: "var(--navy)" }}>{stats.average} {stats.average !== "—" && stats.unit ? stats.unit : ""}</strong>
        </div>
        <div>
          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem" }}>Trend</span>
          <strong style={{ color: getTrendColor(stats.trendDirection) }}>
            {getTrendIcon(stats.trendDirection)} {stats.trendDirection}
          </strong>
        </div>
        <div style={{ gridColumn: "1 / span 2" }}>
          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem" }}>Range (Min / Max)</span>
          <strong style={{ color: "var(--navy)" }}>
            {stats.lowest !== "—" ? `${stats.lowest} - ${stats.highest}` : "—"} {stats.lowest !== "—" && stats.unit ? stats.unit : ""}
          </strong>
        </div>
      </div>
    </button>
  );
};

export default SummaryCard;
