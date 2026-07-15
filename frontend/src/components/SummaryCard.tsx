type SummaryCardProps = {
  label: string;
  value?: string | number;
  unit?: string;
  icon: string;
  accent: "blue" | "rose" | "violet" | "orange" | "teal";
};

const SummaryCard = ({ label, value, unit, icon, accent }: SummaryCardProps) => (
  <article className="summary-card">
    <div className={`summary-card__icon summary-card__icon--${accent}`} aria-hidden="true">{icon}</div>
    <p className="summary-card__label">{label}</p>
    <p className="summary-card__value">
      {value ?? "—"}
      {value !== undefined && value !== null && unit ? <span className="summary-card__unit">{unit}</span> : null}
    </p>
    <p className="summary-card__caption">Latest recorded value</p>
  </article>
);

export default SummaryCard;
