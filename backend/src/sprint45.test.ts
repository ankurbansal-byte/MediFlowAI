import { getPatientTimeline } from "./controllers/patientController";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS, MOCK_LAB_REPORTS, MOCK_LAB_OBSERVATIONS } from "./controllers/patientController";
import assert from "assert";

// Force mock data mode for the test
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

function resetState() {
  // Reset Mock Users
  dynamicMockUsers.length = 0;
  dynamicMockUsers.push({
    username: "PAT-110",
    role: "patient",
    patientId: "PAT-110",
    hospitalId: "HOSP-001",
    fullName: "Patient One Ten",
    mobileNumber: "+917618432290",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "PAT-111",
    role: "patient",
    patientId: "PAT-111",
    hospitalId: "HOSP-002",
    fullName: "Patient One Eleven",
    mobileNumber: "+917618432291",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "doctor1",
    role: "doctor",
    doctorId: "DOC-001",
    hospitalId: "HOSP-001",
    fullName: "Doctor Alpha",
    mobileNumber: "+919999999999",
    status: "active",
  });

  // Reset Mock Records
  MOCK_RECORDS["PAT-110"] = [
    {
      patientId: "PAT-110",
      parameter: "blood_sugar",
      value: 120,
      unit: "mg/dL",
      context: "fasting",
      recordedAt: new Date("2026-07-25T08:00:00.000Z"),
      source: "whatsapp",
      whatsappMessageId: "msg_sugar_1"
    },
    {
      patientId: "PAT-110",
      parameter: "blood_pressure",
      value: "128/82",
      unit: "mmHg",
      recordedAt: new Date("2026-07-26T10:00:00.000Z"),
      source: "whatsapp",
      whatsappMessageId: "msg_bp_1"
    }
  ];

  MOCK_LAB_OBSERVATIONS["PAT-110"] = [
    {
      patientId: "PAT-110",
      hospitalId: "HOSP-001",
      testName: "Fasting Blood Glucose",
      canonicalTestKey: "fbs",
      value: 77,
      unit: "mg/dL",
      referenceRangeText: "70-100",
      flag: "normal",
      specimenDate: new Date("2026-07-27T07:30:00.000Z"),
      source: "whatsapp_image",
      whatsappMessageId: "msg_lab_1",
    }
  ];

  MOCK_RECORDS["PAT-111"] = [
    {
      patientId: "PAT-111",
      parameter: "weight",
      value: 70,
      unit: "kg",
      recordedAt: new Date("2026-07-26T12:00:00.000Z"),
      source: "whatsapp",
      whatsappMessageId: "msg_weight_1"
    }
  ];

  MOCK_LAB_OBSERVATIONS["PAT-111"] = [];
}

async function runTests() {
  console.log("⚙️ Running Sprint 45 Unified Longitudinal Health Record & Timeline Tests...");

  // =========================================================================
  // Test 1: Both routine records & lab observations appear in unified timeline
  // =========================================================================
  resetState();
  const reqTimeline: any = {
    params: { patientId: "PAT-110" },
    query: {},
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resTimeline = mockResponse();
  await getPatientTimeline(reqTimeline, resTimeline);

  assert.strictEqual(resTimeline.statusCode, 200, "Should successfully fetch timeline");
  assert.ok(resTimeline.body.success, "Response should indicate success");
  assert.strictEqual(resTimeline.body.records.length, 3, "Timeline should combine 2 routine records and 1 lab observation");

  const routineItems = resTimeline.body.records.filter((r: any) => r.category === "health_reading");
  const labItems = resTimeline.body.records.filter((r: any) => r.category === "lab_observation");

  assert.strictEqual(routineItems.length, 2, "Should have 2 routine items");
  assert.strictEqual(labItems.length, 1, "Should have 1 lab item");
  console.log("✅ Test 1 Passed: Both routine and lab observations merged successfully in timeline.");

  // =========================================================================
  // Test 2: Routine blood sugar and lab glucose remain semantically distinct
  // =========================================================================
  const routineSugar = routineItems.find((r: any) => r.parameter === "blood_sugar");
  const labSugar = labItems.find((r: any) => r.parameter === "fbs");

  assert.ok(routineSugar, "Routine blood sugar item exists");
  assert.ok(labSugar, "Lab blood glucose item exists");
  assert.strictEqual(routineSugar.category, "health_reading", "Routine sugar category must be health_reading");
  assert.strictEqual(labSugar.category, "lab_observation", "Lab sugar category must be lab_observation");
  assert.notStrictEqual(routineSugar.id, labSugar.id, "Different records must have distinct IDs");
  console.log("✅ Test 2 Passed: Routine blood sugar and lab glucose remain semantically distinct.");

  // =========================================================================
  // Test 3: Blood Pressure serialization is correct (systolic & diastolic)
  // =========================================================================
  const routineBP = routineItems.find((r: any) => r.parameter === "blood_pressure");
  assert.ok(routineBP, "Routine blood pressure exists");
  assert.strictEqual(routineBP.systolic, 128, "Systolic should be parsed as 128");
  assert.strictEqual(routineBP.diastolic, 82, "Diastolic should be parsed as 82");
  assert.strictEqual(routineBP.unit, "mmHg", "Unit should be mmHg");
  console.log("✅ Test 3 Passed: Blood Pressure systolic/diastolic serialization matches expectations.");

  // =========================================================================
  // Test 4: Chronological Ordering (Newest-first by default)
  // =========================================================================
  const records = resTimeline.body.records;
  const time0 = new Date(records[0].recordedAt).getTime();
  const time1 = new Date(records[1].recordedAt).getTime();
  const time2 = new Date(records[2].recordedAt).getTime();

  assert.ok(time0 >= time1, "First item should be newer or equal to second item");
  assert.ok(time1 >= time2, "Second item should be newer or equal to third item");
  assert.strictEqual(records[0].category, "lab_observation", "Newest record is the lab observation on July 27");
  assert.strictEqual(records[1].parameter, "blood_pressure", "Second newest is BP on July 26");
  assert.strictEqual(records[2].parameter, "blood_sugar", "Third newest is sugar on July 25");
  console.log("✅ Test 4 Passed: Chronological newest-first ordering verified.");

  // =========================================================================
  // Test 5: Category Filtering (`category` query param)
  // =========================================================================
  const reqFilterLab: any = {
    params: { patientId: "PAT-110" },
    query: { category: "lab_observation" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resFilterLab = mockResponse();
  await getPatientTimeline(reqFilterLab, resFilterLab);

  assert.strictEqual(resFilterLab.body.records.length, 1, "Should return only 1 record when filtered by category=lab_observation");
  assert.strictEqual(resFilterLab.body.records[0].category, "lab_observation", "Record category must be lab_observation");

  const reqFilterRoutine: any = {
    params: { patientId: "PAT-110" },
    query: { category: "health_reading" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resFilterRoutine = mockResponse();
  await getPatientTimeline(reqFilterRoutine, resFilterRoutine);

  assert.strictEqual(resFilterRoutine.body.records.length, 2, "Should return 2 records when filtered by category=health_reading");
  assert.ok(resFilterRoutine.body.records.every((r: any) => r.category === "health_reading"), "All records must be health_readings");
  console.log("✅ Test 5 Passed: Category filtering works correctly.");

  // =========================================================================
  // Test 6: Date Filtering (`days` query param)
  // =========================================================================
  // Let's mock dates relative to "now". Let's put one record 2 days ago, and another 15 days ago.
  const now = new Date();
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(now.getDate() - 2);
  const fifteenDaysAgo = new Date(); fifteenDaysAgo.setDate(now.getDate() - 15);

  MOCK_RECORDS["PAT-110"] = [
    {
      patientId: "PAT-110",
      parameter: "blood_sugar",
      value: 120,
      unit: "mg/dL",
      recordedAt: twoDaysAgo,
      source: "whatsapp",
      whatsappMessageId: "msg_sugar_now"
    },
    {
      patientId: "PAT-110",
      parameter: "heart_rate",
      value: 72,
      unit: "bpm",
      recordedAt: fifteenDaysAgo,
      source: "whatsapp",
      whatsappMessageId: "msg_hr_old"
    }
  ];
  MOCK_LAB_OBSERVATIONS["PAT-110"] = []; // clear lab

  const reqDaysFilter: any = {
    params: { patientId: "PAT-110" },
    query: { days: "7" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resDaysFilter = mockResponse();
  await getPatientTimeline(reqDaysFilter, resDaysFilter);

  assert.strictEqual(resDaysFilter.body.records.length, 1, "Should filter out the 15-day-old record when querying days=7");
  assert.strictEqual(resDaysFilter.body.records[0].parameter, "blood_sugar", "Should return the 2-day-old blood sugar record");
  console.log("✅ Test 6 Passed: Date (days) filtering works correctly.");

  // =========================================================================
  // Test 7: Patient Ownership & Tenant Isolation
  // =========================================================================
  // Patient PAT-110 trying to access Patient PAT-111
  const reqCrossPatient: any = {
    params: { patientId: "PAT-111" },
    query: {},
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resCrossPatient = mockResponse();
  await getPatientTimeline(reqCrossPatient, resCrossPatient);

  assert.strictEqual(resCrossPatient.statusCode, 403, "Access to other patient's timeline must return 403 Forbidden");
  assert.strictEqual(resCrossPatient.body.success, false, "Response success must be false");
  console.log("✅ Test 7 Passed: Patient ownership isolation successfully enforced.");

  // Doctor of HOSP-001 trying to access Patient of HOSP-002 (PAT-111)
  // HOSP-001 Doctor cannot see HOSP-002 Patient (no assignment, different tenant)
  const reqDoctorCrossTenant: any = {
    params: { patientId: "PAT-111" },
    query: {},
    user: { username: "doctor1", role: "doctor", doctorId: "DOC-001", hospitalId: "HOSP-001" }
  };
  const resDoctorCrossTenant = mockResponse();
  await getPatientTimeline(reqDoctorCrossTenant, resDoctorCrossTenant);

  assert.strictEqual(resDoctorCrossTenant.statusCode, 403, "Access to cross-tenant patient must return 403 Forbidden");
  console.log("✅ Test 8 Passed: Cross-tenant hospital isolation enforced correctly.");

  // =========================================================================
  // Test 8: No Fabricated Clinical Data
  // =========================================================================
  // Check that lab observation matches the properties strictly from database without inventing anything
  resetState();
  const reqValidateFabrication: any = {
    params: { patientId: "PAT-110" },
    query: { category: "lab_observation" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resValidateFabrication = mockResponse();
  await getPatientTimeline(reqValidateFabrication, resValidateFabrication);

  const testLabObj = resValidateFabrication.body.records[0];
  assert.strictEqual(testLabObj.testName, "Fasting Blood Glucose", "testName preserved factually");
  assert.strictEqual(testLabObj.value, 77, "Value preserved factually");
  assert.strictEqual(testLabObj.unit, "mg/dL", "Unit preserved factually");
  assert.strictEqual(testLabObj.referenceRangeText, "70-100", "Reference range preserved factually");
  assert.strictEqual(testLabObj.flag, "normal", "Flag preserved factually");
  console.log("✅ Test 9 Passed: Zero fabricated clinical data in serialization contract.");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 45 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
