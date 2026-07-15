import { useMemo, useState, useRef, useEffect } from "react";
import { formatShortDate } from "../utils/date";

export type PatientOption = {
  patientId: string;
  latestRecordedAt: string;
  totalRecords: number;
};

type PatientListPanelProps = {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelect: (patientId: string) => void;
  isLoading?: boolean;
  isError?: boolean;
};

const PatientListPanel = ({
  patients,
  selectedPatientId,
  onSelect,
  isLoading = false,
  isError = false,
}: PatientListPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((p) => p.patientId.toLowerCase().includes(term));
  }, [patients, searchTerm]);

  // Scroll highlighted item into view if needed
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredPatients.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredPatients.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredPatients.length) % filteredPatients.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (filteredPatients[targetIndex]) {
        onSelect(filteredPatients[targetIndex].patientId);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    } else if (event.key === "Escape") {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  };

  const handleSelectItem = (patientId: string) => {
    onSelect(patientId);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setHighlightedIndex(-1);
  };

  return (
    <aside className="patient-list-panel" aria-label="Patient management workspace">
      <div className="patient-list-panel__header">
        <h2 className="patient-list-panel__title">Patient Directory</h2>
        <span className="patient-list-panel__count" aria-live="polite">
          {patients.length} {patients.length === 1 ? "Patient" : "Patients"}
        </span>
      </div>

      <div className="patient-list-panel__search-box">
        <label className="patient-list-panel__search-label" htmlFor="patient-panel-search">
          Search Patients
        </label>
        <div className="patient-list-panel__search-wrapper">
          <span className="patient-list-panel__search-icon" aria-hidden="true">🔍</span>
          <input
            id="patient-panel-search"
            type="search"
            className="patient-list-panel__search-input"
            placeholder="Search by Patient ID..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="patient-list-panel-options"
          />
        </div>
      </div>

      <div
        id="patient-list-panel-options"
        className="patient-list-panel__list"
        role="listbox"
        aria-label="Patients list"
        ref={listContainerRef}
      >
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="patient-list-panel__skeleton-item">
              <div className="patient-list-panel__skeleton-line-title" />
              <div className="patient-list-panel__skeleton-line-sub" />
            </div>
          ))
        ) : isError ? (
          <div className="patient-list-panel__error-state">
            <span className="patient-list-panel__error-icon" aria-hidden="true">⚠️</span>
            <p className="patient-list-panel__error-text">Failed to load patients</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="patient-list-panel__empty-state">
            <span className="patient-list-panel__empty-icon" aria-hidden="true">🔎</span>
            <p className="patient-list-panel__empty-text">No patients match your search.</p>
          </div>
        ) : (
          filteredPatients.map((patient, idx) => {
            const isSelected = patient.patientId === selectedPatientId;
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                key={patient.patientId}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className={`patient-list-panel__item ${
                  isSelected ? "patient-list-panel__item--selected" : ""
                } ${isHighlighted ? "patient-list-panel__item--highlighted" : ""}`}
                onClick={() => handleSelectItem(patient.patientId)}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                type="button"
              >
                <div className="patient-list-panel__item-header">
                  <span className="patient-list-panel__item-id">{patient.patientId}</span>
                  <span className="patient-list-panel__item-records">
                    {patient.totalRecords} {patient.totalRecords === 1 ? "rec" : "recs"}
                  </span>
                </div>
                <div className="patient-list-panel__item-body">
                  <span className="patient-list-panel__item-activity-label">Last activity:</span>
                  <span className="patient-list-panel__item-activity-date">
                    {patient.latestRecordedAt ? formatShortDate(patient.latestRecordedAt) : "No records"}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default PatientListPanel;
