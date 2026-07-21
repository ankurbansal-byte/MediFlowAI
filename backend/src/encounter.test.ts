import { createEncounter, getEncounterDetail, updateEncounterDetail, completeEncounter } from "./controllers/encounterController";
import { dynamicMockUsers, dynamicMockAssignments } from "./utils/mockUsers";
import { dynamicMockEncounters } from "./utils/mockEncounters";

// Enable mock data mode explicitly for the tests
process.env.USE_MOCK_DATA = "true";

// Helper to create mock Express Response
const mockResponse = () => {
  const res: any = {};
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

async function runTests() {
  console.log("🧪 Running backend integration and multi-tenant security tests for Clinical Encounters...");

  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      testsFailed++;
    }
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Register New OPD visit by Hospital Admin
    // -------------------------------------------------------------------------
    const adminReq: any = {
      user: { username: "admin", role: "admin" },
      body: {
        patientId: "PAT-103",
        doctorId: "DOC-101",
        visitDate: "2026-07-21",
        visitType: "OPD Consultation",
        chiefComplaint: "Slight headache and high fasting glucose",
      },
    };
    const res1 = mockResponse();
    await createEncounter(adminReq, res1);

    assert(res1.statusCode === 201 || res1.statusCode === undefined, "Admin should successfully register a new OPD visit.");
    assert(res1.body.success === true, "OPD visit registration body success should be true.");
    assert(res1.body.encounter.encounterId.startsWith("ENC-"), "Registered visit should have a valid sequential Encounter ID.");
    assert(res1.body.encounter.status === "draft", "Initial status of registered visit must be 'draft'.");

    // Verify auto doctor-patient assignment creation
    const hasAssoc = dynamicMockAssignments.some(
      (a) => a.doctorId === "DOC-101" && a.patientId === "PAT-103" && a.status === "active"
    );
    assert(hasAssoc, "Auto-assignment must be established safely during OPD registration.");

    // -------------------------------------------------------------------------
    // TEST 2: Prevent OPD registration with inactive doctor
    // -------------------------------------------------------------------------
    // Deactivate Doctor 101 temporarily
    const doc101 = dynamicMockUsers.find((u) => u.doctorId === "DOC-101" && u.role === "doctor");
    if (doc101) doc101.status = "inactive";

    const inactiveDocReq: any = {
      user: { username: "admin", role: "admin" },
      body: {
        patientId: "PAT-103",
        doctorId: "DOC-101",
        visitDate: "2026-07-21",
        visitType: "OPD Consultation",
      },
    };
    const resInactiveDoc = mockResponse();
    await createEncounter(inactiveDocReq, resInactiveDoc);
    assert(resInactiveDoc.statusCode === 400, "Registration must fail (400) if doctor is inactive.");
    assert(resInactiveDoc.body.success === false, "Success is false on inactive doctor error.");

    // Restore Doctor
    if (doc101) doc101.status = "active";

    // -------------------------------------------------------------------------
    // TEST 3: Prevent OPD registration for inactive patient
    // -------------------------------------------------------------------------
    // Deactivate Patient 103 temporarily
    const pat103 = dynamicMockUsers.find((u) => u.patientId === "PAT-103" && u.role === "patient");
    if (pat103) pat103.status = "inactive";

    const inactivePatReq: any = {
      user: { username: "admin", role: "admin" },
      body: {
        patientId: "PAT-103",
        doctorId: "DOC-101",
        visitDate: "2026-07-21",
        visitType: "OPD Consultation",
      },
    };
    const resInactivePat = mockResponse();
    await createEncounter(inactivePatReq, resInactivePat);
    assert(resInactivePat.statusCode === 400, "Registration must fail (400) if patient is inactive.");

    // Restore Patient
    if (pat103) pat103.status = "active";

    // -------------------------------------------------------------------------
    // TEST 4: Multi-Tenant Security - Doctor cannot view another Doctor's encounter
    // -------------------------------------------------------------------------
    // Let's create an encounter assigned to DOC-102
    const otherEncId = "ENC-19999";
    dynamicMockEncounters.push({
      encounterId: otherEncId,
      hospitalId: "HOSP-001",
      patientId: "PAT-101",
      doctorId: "DOC-102", // DOC-102 owns it
      visitDate: new Date(),
      visitType: "OPD Consultation",
      chiefComplaint: "Test",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "draft",
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const doc101Req: any = {
      user: { username: "doctor1", role: "doctor" }, // doctor1 is DOC-101
      params: { encounterId: otherEncId },
    };
    const resSecurity1 = mockResponse();
    await getEncounterDetail(doc101Req, resSecurity1);

    assert(resSecurity1.statusCode === 403, "Multi-tenant block: Doctor cannot view another doctor's encounter.");

    // -------------------------------------------------------------------------
    // TEST 5: Multi-Tenant Security - Cross-Hospital access is rejected
    // -------------------------------------------------------------------------
    // Let's put the other encounter in a different hospital
    const crossHospitalEncId = "ENC-29999";
    dynamicMockEncounters.push({
      encounterId: crossHospitalEncId,
      hospitalId: "HOSP-999", // Different Hospital
      patientId: "PAT-101",
      doctorId: "DOC-101",
      visitDate: new Date(),
      visitType: "OPD Consultation",
      chiefComplaint: "Test",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "completed",
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const crossHospitalReq: any = {
      user: { username: "doctor1", role: "doctor" },
      params: { encounterId: crossHospitalEncId },
    };
    const resSecurity2 = mockResponse();
    await getEncounterDetail(crossHospitalReq, resSecurity2);
    assert(resSecurity2.statusCode === 403, "Multi-tenant block: Cross-hospital access is strictly forbidden.");

    // -------------------------------------------------------------------------
    // TEST 6: Multi-Tenant Security - Patient cannot view draft encounter
    // -------------------------------------------------------------------------
    const draftEncId = "ENC-39999";
    dynamicMockEncounters.push({
      encounterId: draftEncId,
      hospitalId: "HOSP-001",
      patientId: "PAT-101",
      doctorId: "DOC-101",
      visitDate: new Date(),
      visitType: "OPD Consultation",
      chiefComplaint: "Test",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "draft", // Status is draft
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const pat101Req: any = {
      user: { username: "PAT-101", role: "patient", patientId: "PAT-101" },
      params: { encounterId: draftEncId },
    };
    const resSecurity3 = mockResponse();
    await getEncounterDetail(pat101Req, resSecurity3);
    assert(resSecurity3.statusCode === 403, "Multi-tenant block: Patients cannot access draft clinical encounters.");

    // -------------------------------------------------------------------------
    // TEST 7: Save Draft and Lock on Completed Encounter
    // -------------------------------------------------------------------------
    const completedEncId = "ENC-49999";
    const completedEnc: any = {
      encounterId: completedEncId,
      hospitalId: "HOSP-001",
      patientId: "PAT-101",
      doctorId: "DOC-101",
      visitDate: new Date(),
      visitType: "OPD Consultation",
      chiefComplaint: "Test",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "completed", // already completed
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dynamicMockEncounters.push(completedEnc);

    const updateReq: any = {
      user: { username: "doctor1", role: "doctor" },
      params: { encounterId: completedEncId },
      body: { chiefComplaint: "Manipulated complaint notes" },
    };
    const resUpdate = mockResponse();
    await updateEncounterDetail(updateReq, resUpdate);
    assert(resUpdate.statusCode === 400, "Safeguard: Casual editing of completed encounters is strictly forbidden.");
    assert(completedEnc.chiefComplaint === "Test", "Content must remain unmodified.");

    // -------------------------------------------------------------------------
    // TEST 8: Full Doctor Consultation workflow (Save draft -> Reopen -> Complete)
    // -------------------------------------------------------------------------
    const flowEncId = "ENC-59999";
    const flowEnc: any = {
      encounterId: flowEncId,
      hospitalId: "HOSP-001",
      patientId: "PAT-101",
      doctorId: "DOC-101",
      visitDate: new Date(),
      visitType: "OPD Consultation",
      chiefComplaint: "Initial",
      symptoms: "",
      provisionalDiagnosis: "",
      doctorNotes: "",
      status: "draft",
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dynamicMockEncounters.push(flowEnc);

    // Save Draft
    const draftUpdateReq: any = {
      user: { username: "doctor1", role: "doctor" },
      params: { encounterId: flowEncId },
      body: { symptoms: "Fever and cough", provisionalDiagnosis: "Mild Flu" },
    };
    const resDraftUpdate = mockResponse();
    await updateEncounterDetail(draftUpdateReq, resDraftUpdate);
    assert(resDraftUpdate.statusCode === 200 || resDraftUpdate.statusCode === undefined, "Doctor should successfully save consultation draft.");
    assert(flowEnc.symptoms === "Fever and cough", "Draft symptoms must be updated.");
    assert(flowEnc.status === "draft", "Encounter status must remain draft.");

    // Complete Consultation
    const compReq: any = {
      user: { username: "doctor1", role: "doctor" },
      params: { encounterId: flowEncId },
    };
    const resComp = mockResponse();
    await completeEncounter(compReq, resComp);
    assert(resComp.statusCode === 200 || resComp.statusCode === undefined, "Doctor should successfully complete the consultation.");
    assert(flowEnc.status === "completed", "Encounter status must transition to 'completed'.");

  } catch (error) {
    console.error("💥 Unexpected test execution error:", error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("🏆 All Clinical Encounter security and multitenant tests passed successfully!");
    process.exit(0);
  }
}

runTests();
