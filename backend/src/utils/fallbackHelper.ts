import { DeterministicAnalyticsResult } from "../utils/analyticsHelper";

/**
 * Builds a patient-friendly deterministic factual text narrative summary.
 * Used as a standalone summary or a guaranteed fallback in case of LLM failures or constraints.
 */
export function buildDeterministicNarrativeSummary(analytics: DeterministicAnalyticsResult): string {
  const parts: string[] = [];
  const daysStr = analytics.periodDays === 36500 ? "all-time history" : `last ${analytics.periodDays} days`;
  parts.push(`Deterministic Health Summary for the ${daysStr} (from ${analytics.startDate.toLocaleDateString("en-GB")} to ${analytics.endDate.toLocaleDateString("en-GB")}).`);

  if (analytics.totalRoutineReadings === 0 && analytics.totalLabObservations === 0) {
    parts.push("No health records or laboratory observations were found for this period.");
    return parts.join("\n\n");
  }

  parts.push(`A total of ${analytics.totalRoutineReadings} routine readings and ${analytics.totalLabObservations} laboratory observations were recorded.`);

  const keys = Object.keys(analytics.parameterMetrics);
  if (keys.length > 0) {
    parts.push("Routine Readings Summary:");
    for (const key of keys) {
      const metric = analytics.parameterMetrics[key];
      const paramName = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      if (key === "blood_sugar" && metric.byContext) {
        const ctxParts: string[] = [];
        for (const ctx of Object.keys(metric.byContext)) {
          const ctxMetric = metric.byContext[ctx];
          const ctxName = ctx.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          ctxParts.push(`- ${ctxName} Sugar: ${ctxMetric.count} reading(s). Average: ${ctxMetric.average} ${ctxMetric.latest?.unit || ""}. Min/Max: ${ctxMetric.min}/${ctxMetric.max} ${ctxMetric.latest?.unit || ""}. Latest: ${ctxMetric.latest?.value} ${ctxMetric.latest?.unit || ""}.`);
        }
        parts.push(`- ${paramName}:\n${ctxParts.join("\n")}`);
      } else {
        parts.push(`- ${paramName}: ${metric.count} reading(s). Average: ${metric.average ?? "N/A"}. Min/Max: ${metric.min ?? "N/A"}/${metric.max ?? "N/A"}. Latest: ${metric.latest?.value ?? "N/A"} ${metric.latest?.unit || ""}.`);
      }
    }
  }

  if (analytics.labObservations.length > 0) {
    parts.push("Laboratory Observations Summary:");
    for (const lab of analytics.labObservations) {
      const flagText = lab.flag ? ` [Flag: ${lab.flag}]` : "";
      const refText = lab.referenceRangeText ? ` (Ref: ${lab.referenceRangeText})` : "";
      const labDate = lab.specimenDate ? ` on ${new Date(lab.specimenDate).toLocaleDateString("en-GB")}` : "";
      parts.push(`- ${lab.testName}: ${lab.value} ${lab.unit}${flagText}${refText}${labDate}`);
    }
  }

  // Comparisons
  const validComps = analytics.comparisons.filter(c => c.previousCount > 0);
  if (validComps.length > 0) {
    parts.push("Comparison with previous period:");
    for (const comp of validComps) {
      const paramLabel = comp.parameter.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const ctxLabel = comp.context ? ` (${comp.context.replace(/_/g, " ")})` : "";
      parts.push(`- ${paramLabel}${ctxLabel}: Current Avg ${comp.currentAverage} (vs Previous Avg ${comp.previousAverage}).`);
    }
  }

  parts.push("Clinical Disclaimer: This is a descriptive and factual record summary only. It does not diagnose disease, prescribe medications, or replace professional medical consultations.");

  return parts.join("\n\n");
}
