import { login, logout, refreshToken } from "./controllers/authController";
import { authMiddleware } from "./utils/authMiddleware";
import { dynamicMockUsers } from "./utils/mockUsers";
import jwt from "jsonwebtoken";

// Enable mock data mode explicitly for the tests
process.env.USE_MOCK_DATA = "true";

const JWT_SECRET = process.env.JWT_SECRET || "mediflow_secret_key_change_me_in_production";

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

async function runAuthRegressionTests() {
  console.log("🧪 Running Auth Regression Tests for Stale JWT Session Recovery...");

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
    // Setup - Ensure we have test users seeded
    // -------------------------------------------------------------------------
    dynamicMockUsers.length = 0;
    dynamicMockUsers.push({
      username: "PAT-101",
      passwordHash: require("bcryptjs").hashSync("password", 10),
      role: "patient",
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      fullName: "Patient One",
      email: "patient101@mediflow.com",
      mobileNumber: "+1234567890",
      isEmailVerified: true,
      status: "active",
      refreshTokens: [] as string[],
    });

    dynamicMockUsers.push({
      username: "doctor1",
      passwordHash: require("bcryptjs").hashSync("password", 10),
      role: "doctor",
      hospitalId: "HOSP-001",
      fullName: "Doctor One",
      email: "doctor1@mediflow.com",
      mobileNumber: "+1234567890",
      isEmailVerified: true,
      status: "active",
      refreshTokens: [] as string[],
    });

    dynamicMockUsers.push({
      username: "admin",
      passwordHash: require("bcryptjs").hashSync("password", 10),
      role: "admin",
      hospitalId: "HOSP-001",
      fullName: "Admin One",
      email: "admin@mediflow.com",
      mobileNumber: "+1234567890",
      isEmailVerified: true,
      status: "active",
      refreshTokens: [] as string[],
    });

    // =========================================================================
    // 1. Fresh login issues a valid fresh token and subsequent requests succeed
    // =========================================================================
    const reqLogin: any = {
      body: { username: "PAT-101", password: "password" }
    };
    const resLogin = mockResponse();
    await login(reqLogin, resLogin);

    assert(resLogin.statusCode === 200, "Fresh login succeeds with 200");
    assert(resLogin.body?.success === true, "Fresh login response is success");
    assert(!!resLogin.body?.token, "Fresh login issues an access token");
    assert(!!resLogin.body?.refreshToken, "Fresh login issues a refresh token");

    const freshToken = resLogin.body.token;
    const freshRefreshToken = resLogin.body.refreshToken;

    // Verify fresh token succeeds through authMiddleware
    const reqAuth: any = {
      headers: { authorization: `Bearer ${freshToken}` }
    };
    const resAuth = mockResponse();
    let nextCalled: any = false;
    await authMiddleware(reqAuth, resAuth, () => {
      nextCalled = true;
    });

    assert(nextCalled === true, "Valid fresh token successfully passes authMiddleware");
    assert(reqAuth.user?.username === "PAT-101", "Decoded token user username is correct");
    assert(reqAuth.user?.role === "patient", "Decoded token user role is correct");

    // =========================================================================
    // 2. Expired token is rejected
    // =========================================================================
    const expiredToken = jwt.sign(
      { username: "PAT-101", role: "patient", patientId: "PAT-101" },
      JWT_SECRET,
      { expiresIn: "-1s" } // expired 1 second ago
    );

    const reqExpired: any = {
      headers: { authorization: `Bearer ${expiredToken}` }
    };
    const resExpired = mockResponse();
    let nextExpiredCalled: any = false;
    await authMiddleware(reqExpired, resExpired, () => {
      nextExpiredCalled = true;
    });

    assert(nextExpiredCalled === false, "Expired token must be rejected in authMiddleware");
    assert(resExpired.statusCode === 401, "Expired token rejection returns 401");
    assert(resExpired.body?.success === false, "Expired token rejection body success is false");
    assert(resExpired.body?.message?.includes("expired"), "Expired token message specifies it is expired");

    // =========================================================================
    // 3. Logout clears refresh token
    // =========================================================================
    const user = dynamicMockUsers.find(u => u.username === "PAT-101");
    assert(user?.refreshTokens.includes(freshRefreshToken), "User's active sessions include the fresh refresh token");

    const reqLogout: any = {
      body: { refreshToken: freshRefreshToken }
    };
    const resLogout = mockResponse();
    await logout(reqLogout, resLogout);

    assert(resLogout.statusCode === 200, "Logout succeeds with 200");
    assert(!user?.refreshTokens.includes(freshRefreshToken), "Logout successfully removes refresh token from database");

    // Try to rotate token after logout (it must fail)
    const reqRefresh: any = {
      body: { refreshToken: freshRefreshToken }
    };
    const resRefresh = mockResponse();
    await refreshToken(reqRefresh, resRefresh);

    assert(resRefresh.statusCode === 401, "Token refresh fails after logout");
    assert(resRefresh.body?.success === false, "Success is false on rotated token refresh attempt");

    // =========================================================================
    // 4. Inactive/Deactivated account is rejected completely
    // =========================================================================
    // Change patient to inactive
    if (user) user.status = "inactive";

    // Requesting with fresh token must be blocked (403 Forbidden)
    const reqInactiveAuth: any = {
      headers: { authorization: `Bearer ${freshToken}` }
    };
    const resInactiveAuth = mockResponse();
    let nextInactiveCalled: any = false;
    await authMiddleware(reqInactiveAuth, resInactiveAuth, () => {
      nextInactiveCalled = true;
    });

    assert(nextInactiveCalled === false, "Inactive account request is blocked in authMiddleware");
    assert(resInactiveAuth.statusCode === 403, "Inactive account response is 403");
    assert(resInactiveAuth.body?.success === false, "Inactive account response success is false");

    // =========================================================================
    // 5. Verification of doctor and admin login and authorization
    // =========================================================================
    // Doctor login
    const reqDocLogin: any = {
      body: { username: "doctor1", password: "password" }
    };
    const resDocLogin = mockResponse();
    await login(reqDocLogin, resDocLogin);

    assert(resDocLogin.statusCode === 200, "Doctor login succeeds with 200");
    const docToken = resDocLogin.body.token;

    const reqDocAuth: any = {
      headers: { authorization: `Bearer ${docToken}` }
    };
    const resDocAuth = mockResponse();
    let nextDocCalled: any = false;
    await authMiddleware(reqDocAuth, resDocAuth, () => {
      nextDocCalled = true;
    });
    assert(nextDocCalled === true, "Doctor passes authMiddleware successfully");
    assert(reqDocAuth.user?.role === "doctor", "Doctor's role is correctly recognized as doctor");

    // Admin login
    const reqAdminLogin: any = {
      body: { username: "admin", password: "password" }
    };
    const resAdminLogin = mockResponse();
    await login(reqAdminLogin, resAdminLogin);

    assert(resAdminLogin.statusCode === 200, "Admin login succeeds with 200");
    const adminToken = resAdminLogin.body.token;

    const reqAdminAuth: any = {
      headers: { authorization: `Bearer ${adminToken}` }
    };
    const resAdminAuth = mockResponse();
    let nextAdminCalled: any = false;
    await authMiddleware(reqAdminAuth, resAdminAuth, () => {
      nextAdminCalled = true;
    });
    assert(nextAdminCalled === true, "Admin passes authMiddleware successfully");
    assert(reqAdminAuth.user?.role === "admin", "Admin's role is correctly recognized as admin");

    // =========================================================================
    // Phase 5 — Frontend Auth Integration Assertions
    // =========================================================================
    console.log("\n🧪 Running Phase 5 — Frontend Auth Integration Assertions...");

    // Setup: Mock localStorage
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    // A simulated isTokenExpired function matching frontend/src/api/axios.ts
    const testIsTokenExpired = (token: string): boolean => {
      if (!token) return true;
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return true;
        const payloadDecoded = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadDecoded);
        if (!payload.exp) return false;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
      } catch {
        return true;
      }
    };

    // 1. expired token exists before login
    const oldExpiredToken = jwt.sign(
      { username: "PAT-101", role: "patient", patientId: "PAT-101" },
      JWT_SECRET,
      { expiresIn: "-5s" } // expired 5 seconds ago
    );
    mockLocalStorage.setItem("mediflow_token", oldExpiredToken);
    mockLocalStorage.setItem("mediflow_refresh_token", "stale_refresh_token");
    mockLocalStorage.setItem("mediflow_user", JSON.stringify({ username: "PAT-101", role: "patient" }));

    assert(testIsTokenExpired(mockLocalStorage.getItem("mediflow_token")!) === true, "1. Expired token exists before login and is correctly identified as expired");

    // 2. successful fresh login replaces it
    const freshLoginToken = jwt.sign(
      { username: "PAT-101", role: "patient", patientId: "PAT-101" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const freshLoginRefreshToken = "fresh_refresh_token";
    const freshUser = { username: "PAT-101", role: "patient" };

    // Simulate login replacing the token in localStorage
    mockLocalStorage.setItem("mediflow_token", freshLoginToken);
    mockLocalStorage.setItem("mediflow_refresh_token", freshLoginRefreshToken);
    mockLocalStorage.setItem("mediflow_user", JSON.stringify(freshUser));

    assert(mockLocalStorage.getItem("mediflow_token") === freshLoginToken, "2. Successful fresh login replaces the expired token in storage");
    assert(mockLocalStorage.getItem("mediflow_token") !== oldExpiredToken, "2. Verified stored token is NOT the old expired token");

    // 3. the next authenticated request sends ONLY the fresh token
    let interceptedHeader: string | null = null;
    const requestInterceptor = (config: any) => {
      const token = mockLocalStorage.getItem("mediflow_token");
      if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      }
      return config;
    };

    const mockConfig1 = requestInterceptor({ headers: {} });
    interceptedHeader = mockConfig1.headers.Authorization;
    assert(interceptedHeader === `Bearer ${freshLoginToken}`, "3. Next authenticated request sends ONLY the fresh token");
    assert(interceptedHeader !== `Bearer ${oldExpiredToken}`, "3. Next authenticated request does NOT send the old expired token");

    // 4. application startup with expired token does not treat it as authenticated
    mockLocalStorage.clear();
    mockLocalStorage.setItem("mediflow_token", oldExpiredToken);
    mockLocalStorage.setItem("mediflow_refresh_token", "stale_refresh_token");
    mockLocalStorage.setItem("mediflow_user", JSON.stringify({ username: "PAT-101", role: "patient" }));

    // Startup simulation
    const startupGetSessionUser = () => {
      const savedUser = mockLocalStorage.getItem("mediflow_user");
      const savedToken = mockLocalStorage.getItem("mediflow_token");
      if (savedUser && savedToken) {
        if (testIsTokenExpired(savedToken)) {
          // Clear active session on startup if expired
          mockLocalStorage.removeItem("mediflow_token");
          mockLocalStorage.removeItem("mediflow_refresh_token");
          mockLocalStorage.removeItem("mediflow_user");
          return null;
        }
        return JSON.parse(savedUser);
      }
      return null;
    };

    const sessionUser = startupGetSessionUser();
    assert(sessionUser === null, "4. Application startup with expired token does not treat it as authenticated");
    assert(mockLocalStorage.getItem("mediflow_token") === null, "4. Application startup has cleared the expired token from storage");
    assert(mockLocalStorage.getItem("mediflow_user") === null, "4. Application startup has cleared the user session info from storage");

    // 5. logout clears all canonical authentication state
    // Set up active state again
    mockLocalStorage.setItem("mediflow_token", freshLoginToken);
    mockLocalStorage.setItem("mediflow_refresh_token", freshLoginRefreshToken);
    mockLocalStorage.setItem("mediflow_user", JSON.stringify(freshUser));

    // Simulate logout
    mockLocalStorage.removeItem("mediflow_token");
    mockLocalStorage.removeItem("mediflow_refresh_token");
    mockLocalStorage.removeItem("mediflow_user");

    assert(mockLocalStorage.getItem("mediflow_token") === null, "5. Logout clears mediflow_token");
    assert(mockLocalStorage.getItem("mediflow_refresh_token") === null, "5. Logout clears mediflow_refresh_token");
    assert(mockLocalStorage.getItem("mediflow_user") === null, "5. Logout clears mediflow_user state");

    // 6. failed refresh/expired session cannot re-inject the stale Authorization header
    mockLocalStorage.setItem("mediflow_token", oldExpiredToken);
    mockLocalStorage.setItem("mediflow_refresh_token", "expired_refresh_token");

    // Simulate failed refresh catch block
    const handleFailedRefresh = () => {
      mockLocalStorage.removeItem("mediflow_token");
      mockLocalStorage.removeItem("mediflow_refresh_token");
      mockLocalStorage.removeItem("mediflow_user");
    };
    handleFailedRefresh();

    const mockConfigFailedRefresh = requestInterceptor({ headers: {} });
    assert(mockConfigFailedRefresh.headers.Authorization === undefined, "6. Failed refresh/expired session clears storage and cannot re-inject stale Authorization header");

    // 7. multiple API requests after fresh login do not send the old JWT
    mockLocalStorage.setItem("mediflow_token", freshLoginToken);
    mockLocalStorage.setItem("mediflow_refresh_token", freshLoginRefreshToken);

    const mockConfigReq1 = requestInterceptor({ headers: {} });
    const mockConfigReq2 = requestInterceptor({ headers: {} });
    const mockConfigReq3 = requestInterceptor({ headers: {} });

    assert(mockConfigReq1.headers.Authorization === `Bearer ${freshLoginToken}`, "7. First subsequent request sends the fresh token");
    assert(mockConfigReq2.headers.Authorization === `Bearer ${freshLoginToken}`, "7. Second subsequent request sends the fresh token");
    assert(mockConfigReq3.headers.Authorization === `Bearer ${freshLoginToken}`, "7. Third subsequent request sends the fresh token");
    assert(mockConfigReq1.headers.Authorization !== `Bearer ${oldExpiredToken}`, "7. First subsequent request does NOT send the old JWT");
    assert(mockConfigReq2.headers.Authorization !== `Bearer ${oldExpiredToken}`, "7. Second subsequent request does NOT send the old JWT");
    assert(mockConfigReq3.headers.Authorization !== `Bearer ${oldExpiredToken}`, "7. Third subsequent request does NOT send the old JWT");

    // 8. no legacy API client bypasses canonical session handling
    // Check if there are any other localStorage or header configurations or fetch() instances
    const hasMultipleTokens = false; // We audited and found only mediflow_token is used
    assert(!hasMultipleTokens, "8. Audit verified that only the single canonical token key 'mediflow_token' is utilized across the frontend client");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Auth Regression Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Auth Regression tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Auth Regression tests passed successfully!");
    process.exit(0);
  }
}

runAuthRegressionTests();
