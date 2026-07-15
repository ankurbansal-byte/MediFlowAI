export type TimelineFilterValue =
  | "all"
  | "blood_sugar"
  | "blood_pressure"
  | "heart_rate"
  | "body_temperature"
  | "weight";

type TimelineFilterProps = {
  value: TimelineFilterValue;
  onChange: (value: TimelineFilterValue) => void;
};

const filterOptions: { label: string; value: TimelineFilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Blood Sugar", value: "blood_sugar" },
  { label: "Blood Pressure", value: "blood_pressure" },
  { label: "Heart Rate", value: "heart_rate" },
  { label: "Temperature", value: "body_temperature" },
  { label: "Weight", value: "weight" },
];

const TimelineFilter = ({ value, onChange }: TimelineFilterProps) => (
  <div className="timeline-filter" aria-label="Filter timeline records">
    {filterOptions.map((option) => (
      <button
        aria-pressed={value === option.value}
        className={`timeline-filter__option${value === option.value ? " timeline-filter__option--active" : ""}`}
        key={option.value}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default TimelineFilter;
