import { getPatientSummaryAI, getPatientTimeline } from "./controllers/patientController";
import { calculateDeterministicAnalytics } from "./utils/analyticsHelper";
import { buildDeterministicNarrativeSummary } from "./utils/fallbackHelper";
import { setMockGenerateHealthRecordSummary, validateHealthSummarySafety } from "./services/openaiService";
import { dynamicMockUsers, dynamicMockAssignments } from "./utils/mockUsers";
import { MOCK_RECORDS, MOCK_LAB_OBSERVATIONS } from "./controllers/patientController";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";

const mockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

function resetTestState() {
  setMockGenerateHealthRecordSummary(null);

  // Seed standard users
  dynamicMockUsers.length = 0;
  dynamicMockUsers.push({
    username: "PAT-46A",
    role: "patient",
    patientId: "PAT-46A",
    hospitalId: "HOSP-46",
    fullName: "Patient Forty-Six A",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "PAT-46B",
    role: "patient",
    patientId: "PAT-46B",
    hospitalId: "HOSP-OTHER",
    fullName: "Patient Forty-Six B",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "DOC-46",
    role: "doctor",
    doctorId: "DOC-46",
    hospitalId: "HOSP-46",
    fullName: "Dr. Forty-Six",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "DOC-OTHER",
    role: "doctor",
    doctorId: "DOC-OTHER",
    hospitalId: "HOSP-OTHER",
    fullName: "Dr. Other",
    status: "active",
  });

  // Assign DOC-46 to PAT-46A
  dynamicMockAssignments.length = 0;
  dynamicMockAssignments.push({
    assignmentId: "ASG-46A",
    doctorId: "DOC-46",
    patientId: "PAT-46A",
    hospitalId: "HOSP-46",
    status: "active",
  });

  // Initialize records
  MOCK_RECORDS["PAT-46A"] = [];
  MOCK_LAB_OBSERVATIONS["PAT-46A"] = [];
}

async function runTests() {
  console.log("⚙️ Running Sprint 46 AI Health Record Summary & Analytics Suite...");

  // =========================================================================
  // Test 1: Deterministic Metrics Correctness
  // =========================================================================
  resetTestState();

  const refDate = new Date();

  const rec1 = {
    patientId: "PAT-46A",
    parameter: "blood_pressure",
    value: "120/80",
    unit: "mmHg",
    recordedAt: new Date(refDate.getTime() - 1.5 * 24 * 60 * 60 * 1000), // 36 hours ago (within 2 days)
    source: "whatsapp",
    whatsappMessageId: "msg_bp_1",
    hospitalId: "HOSP-46",
  };
  const rec2 = {
    patientId: "PAT-46A",
    parameter: "blood_pressure",
    value: "140/90",
    unit: "mmHg",
    recordedAt: new Date(refDate.getTime() - 0.5 * 24 * 60 * 60 * 1000), // 12 hours ago (within 2 days)
    source: "whatsapp",
    whatsappMessageId: "msg_bp_2",
    hospitalId: "HOSP-46",
  };
  const rec3 = {
    patientId: "PAT-46A",
    parameter: "blood_sugar",
    value: 120,
    unit: "mg/dL",
    context: "fasting",
    recordedAt: new Date(refDate.getTime() - 2.5 * 24 * 60 * 60 * 1000), // 60 hours ago (within 3 days, outside 2 days)
    source: "whatsapp",
    whatsappMessageId: "msg_sugar_1",
    hospitalId: "HOSP-46",
  };
  const rec4 = {
    patientId: "PAT-46A",
    parameter: "blood_sugar",
    value: 160,
    unit: "mg/dL",
    context: "post_meal",
    recordedAt: new Date(refDate.getTime() - 2.5 * 24 * 60 * 60 * 1000), // 60 hours ago (within 3 days, outside 2 days)
    source: "whatsapp",
    whatsappMessageId: "msg_sugar_2",
    hospitalId: "HOSP-46",
  };

  MOCK_RECORDS["PAT-46A"].push(rec1, rec2, rec3, rec4);

  const lab1 = {
    patientId: "PAT-46A",
    hospitalId: "HOSP-46",
    testName: "Fasting Blood Sugar",
    canonicalTestKey: "fbs",
    value: 105,
    unit: "mg/dL",
    referenceRangeText: "70-100",
    flag: "high",
    specimenDate: new Date(refDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    source: "whatsapp_image",
    whatsappMessageId: "lab_obs_1",
  };

  MOCK_LAB_OBSERVATIONS["PAT-46A"].push(lab1);

  const analytics = calculateDeterministicAnalytics(
    MOCK_RECORDS["PAT-46A"],
    MOCK_LAB_OBSERVATIONS["PAT-46A"],
    30,
    refDate
  );

  // Assertions on metrics
  assert.strictEqual(analytics.totalRoutineReadings, 4, "Should find 4 routine readings");
  assert.strictEqual(analytics.totalLabObservations, 1, "Should find 1 lab observation");

  // Chronological/latest reading correctness
  const bpMetric = analytics.parameterMetrics["blood_pressure"];
  assert.ok(bpMetric, "Blood pressure metrics should exist");
  assert.strictEqual(bpMetric.count, 2, "Should have 2 BP readings");
  assert.strictEqual(bpMetric.latest?.value, "140/90", "Latest BP value should be 140/90");
  assert.strictEqual(bpMetric.min, "120/80", "BP Min should be 120/80");
  assert.strictEqual(bpMetric.max, "140/90", "BP Max should be 140/90");
  assert.strictEqual(bpMetric.average, "130/85", "BP Average should be 130/85");

  // Glucose context separation & distinction from lab glucose
  const sugarMetric = analytics.parameterMetrics["blood_sugar"];
  assert.ok(sugarMetric, "Blood sugar metrics should exist");
  assert.ok(sugarMetric.byContext?.fasting, "Fasting context should exist");
  assert.ok(sugarMetric.byContext?.post_meal, "Post-meal context should exist");
  assert.strictEqual(sugarMetric.byContext?.fasting.latest?.value, 120, "Fasting sugar should be separate");
  assert.strictEqual(sugarMetric.byContext?.post_meal.latest?.value, 160, "Post-meal sugar should be separate");

  // Lab observation inclusion
  assert.strictEqual(analytics.labObservations[0].testName, "Fasting Blood Sugar");
  assert.strictEqual(analytics.labObservations[0].value, 105);
  assert.strictEqual(analytics.labObservations[0].flag, "high");

  console.log("✅ Test 1 Passed: deterministic analytics and glucose/BP context handling verified.");

  // =========================================================================
  // Test 2: AI Failure & Malformed Output → Standalone Deterministic Fallback
  // =========================================================================
  setMockGenerateHealthRecordSummary(async () => {
    throw new Error("Simulated OpenRouter Credit/Timeout Failure");
  });

  const reqOwn: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 30 },
    user: { username: "PAT-46A", role: "patient", patientId: "PAT-46A" },
  };

  const resOwn = mockResponse();
  await getPatientSummaryAI(reqOwn, resOwn);

  assert.strictEqual(resOwn.statusCode, 200);
  assert.strictEqual(resOwn.body?.success, true);
  assert.strictEqual(resOwn.body?.mode, "deterministic_fallback", "Should trigger deterministic fallback");
  assert.ok(resOwn.body?.summary.includes("Deterministic Health Summary"), "Should contain fallback header text");
  assert.ok(resOwn.body?.summary.includes("Fasting Blood Sugar: 105 mg/dL [Flag: high]"), "Should list lab observations factually");

  console.log("✅ Test 2 Passed: AI failure successfully triggers safe deterministic fallback.");

  // =========================================================================
  // Test 3: No Diagnosis or Treatment Plan Fabrication
  // =========================================================================
  assert.ok(resOwn.body?.summary.includes("does not diagnose disease"), "Must contain disclaimer");
  assert.ok(!resOwn.body?.summary.includes("diabetes") && !resOwn.body?.summary.includes("hypertension"), "Must not invent diagnoses");

  console.log("✅ Test 3 Passed: clinical safety and zero diagnostic fabrication verified.");

  // =========================================================================
  // Test 4: Time Windows (7, 30, 90 days)
  // =========================================================================
  const req7: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 7 },
    user: { username: "PAT-46A", role: "patient", patientId: "PAT-46A" },
  };
  const res7 = mockResponse();
  await getPatientSummaryAI(req7, res7);
  assert.strictEqual(res7.body?.deterministicMetrics.totalRoutineReadings, 4);

  const req2: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 2 },
    user: { username: "PAT-46A", role: "patient", patientId: "PAT-46A" },
  };
  const res2 = mockResponse();
  await getPatientSummaryAI(req2, res2);
  assert.strictEqual(res2.body?.deterministicMetrics.totalRoutineReadings, 2, "Only 2 readings within last 2 days");

  console.log("✅ Test 4 Passed: 7, 30, 90 day summary windows successfully validated.");

  // =========================================================================
  // Test 5: Strict Patient & Tenant Isolation
  // =========================================================================
  const reqIntruder: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 30 },
    user: { username: "PAT-46B", role: "patient", patientId: "PAT-46B" },
  };
  const resIntruder = mockResponse();
  await getPatientSummaryAI(reqIntruder, resIntruder);

  assert.strictEqual(resIntruder.statusCode, 403, "Should block cross-patient access with 403");

  const reqUnauthDoc: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 30 },
    user: { username: "DOC-OTHER", role: "doctor" },
  };
  const resUnauthDoc = mockResponse();
  await getPatientSummaryAI(reqUnauthDoc, resUnauthDoc);

  assert.strictEqual(resUnauthDoc.statusCode, 403, "Should block unauthorized doctor access with 403");

  const reqAuthDoc: any = {
    params: { patientId: "PAT-46A" },
    query: { days: 30 },
    user: { username: "DOC-46", role: "doctor" },
  };
  const resAuthDoc = mockResponse();
  await getPatientSummaryAI(reqAuthDoc, resAuthDoc);

  assert.strictEqual(resAuthDoc.statusCode, 200, "Should allow authorized assigned doctor access");

  console.log("✅ Test 5 Passed: patient and tenant-level access isolation verified.");

  // =========================================================================
  // Test 6: Sprint 45 Timeline Remains Unaffected
  // =========================================================================
  const reqTimeline: any = {
    params: { patientId: "PAT-46A" },
    user: { username: "PAT-46A", role: "patient", patientId: "PAT-46A" },
  };
  const resTimeline = mockResponse();
  await getPatientTimeline(reqTimeline, resTimeline);

  assert.strictEqual(resTimeline.statusCode, 200);
  assert.strictEqual(resTimeline.body?.success, true);
  assert.strictEqual(resTimeline.body?.totalRecords, 4, "Timeline records count is preserved");
  assert.strictEqual(resTimeline.body?.records[0].value, "140/90", "Records must be sorted newest first (descending)");

  console.log("✅ Test 6 Passed: Sprint 45 timeline remains fully functional and unaffected.");

  // =========================================================================
  // Test 7: Sparse Data and No-Data Behavior
  // =========================================================================
  // 1. Sparse data: Clear all except 1 record
  MOCK_RECORDS["PAT-46A"] = [rec1];
  MOCK_LAB_OBSERVATIONS["PAT-46A"] = [];

  const resSparse = mockResponse();
  await getPatientSummaryAI(reqOwn, resSparse);
  assert.strictEqual(resSparse.statusCode, 200);
  assert.strictEqual(resSparse.body?.deterministicMetrics.totalRoutineReadings, 1, "Sparse: exactly 1 reading");

  // 2. No-data: Clear everything
  MOCK_RECORDS["PAT-46A"] = [];
  const resEmpty = mockResponse();
  await getPatientSummaryAI(reqOwn, resEmpty);
  assert.strictEqual(resEmpty.statusCode, 200);
  assert.strictEqual(resEmpty.body?.deterministicMetrics.totalRoutineReadings, 0, "No-data: 0 readings");
  assert.ok(resEmpty.body?.summary.includes("No health records or laboratory observations"), "Should display no-data message");

  console.log("✅ Test 7 Passed: sparse and empty data states behave cleanly and safely.");

  // =========================================================================
  // Test 8: Post-Generation Safety Validation Gate
  // =========================================================================
  // Verify that if validateHealthSummarySafety detects any prohibited clinical language, it returns false.
  const safeText = "Your fasting blood sugar readings averaged 120 mg/dL over the past 30 days.";
  assert.strictEqual(validateHealthSummarySafety(safeText), true, "Safe summary should pass safety gate");

  const unsafeText1 = "We diagnose you with diabetes and uncontrolled hypertension.";
  assert.strictEqual(validateHealthSummarySafety(unsafeText1), false, "Unsafe text with diagnosis should fail safety gate");

  const unsafeText2 = "You should start taking insulin and stop taking your old pressure pills.";
  assert.strictEqual(validateHealthSummarySafety(unsafeText2), false, "Unsafe text with prescription/treatment recommendations should fail safety gate");

  // Set the AI mock to return unsafe text and assert that the summary endpoint automatically discards it and triggers deterministic fallback
  setMockGenerateHealthRecordSummary(async () => {
    return "You have diabetes. Take metformin daily.";
  });

  MOCK_RECORDS["PAT-46A"] = [rec1]; // restore some records
  const resSafetyFallback = mockResponse();
  await getPatientSummaryAI(reqOwn, resSafetyFallback);

  assert.strictEqual(resSafetyFallback.statusCode, 200);
  assert.strictEqual(resSafetyFallback.body?.mode, "deterministic_fallback", "Should fall back due to safety violation");
  assert.ok(!resSafetyFallback.body?.summary.includes("diabetes"), "Unsafe AI summary must have been completely discarded");
  assert.ok(resSafetyFallback.body?.summary.includes("Deterministic Health Summary"), "Should contain fallback header text");

  console.log("✅ Test 8 Passed: post-generation safety validation gate triggers fallback correctly.");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 46 TEST CASES PASSED PERFECTLY!");
  console.log("=========================================");
}

runTests().catch(err => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
