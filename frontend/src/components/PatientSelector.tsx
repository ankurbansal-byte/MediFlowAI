import { useMemo, useState } from "react";

export type PatientOption = {
  patientId: string;
  latestRecordedAt: string;
  totalRecords: number;
};

type PatientSelectorProps = {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelect: (patientId: string) => void;
};

const PatientSelector = ({ patients, selectedPatientId, onSelect }: PatientSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const matchingPatients = useMemo(
    () => patients.filter(({ patientId }) => patientId.includes(searchTerm.trim())),
    [patients, searchTerm],
  );

  const selectPatient = (patientId: string) => {
    onSelect(patientId);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="patient-selector">
      <span className="patient-selector__label">Selected patient</span>
      <button
        aria-expanded={isOpen}
        className="patient-selector__trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{selectedPatientId}</span>
        <span aria-hidden="true" className="patient-selector__chevron">⌄</span>
      </button>

      {isOpen ? (
        <div className="patient-selector__menu">
          <label className="patient-selector__search-label" htmlFor="patient-search">
            Search patients
          </label>
          <input
            autoFocus
            className="patient-selector__search"
            id="patient-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by patient ID"
            type="search"
            value={searchTerm}
          />
          <div className="patient-selector__options" role="listbox">
            {matchingPatients.length > 0 ? (
              matchingPatients.map((patient) => (
                <button
                  aria-selected={patient.patientId === selectedPatientId}
                  className={`patient-selector__option${patient.patientId === selectedPatientId ? " patient-selector__option--selected" : ""}`}
                  key={patient.patientId}
                  onClick={() => selectPatient(patient.patientId)}
                  role="option"
                  type="button"
                >
                  <span>{patient.patientId}</span>
                  <small>{patient.totalRecords} records</small>
                </button>
              ))
            ) : (
              <p className="patient-selector__empty">No matching patient IDs.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PatientSelector;
