# PARSER ARCHITECTURE AUDIT & TECHNICAL REPORT (MEM-M1A)

This document provides a comprehensive, end-to-end architectural audit of the MediFlowAI WhatsApp clinical parsing and processing pipeline. It identifies the root causes of recurring regressions, maps current file dependencies, traces core health entities, details state machine transitions, and proposes an exact refactoring roadmap for the final Parser V2 architecture.

---

## 1. Current Parser Architecture

The MediFlowAI parser operates as a hybrid pipeline utilizing both **Generative AI (OpenRouter LLM)** and a **Deterministic Segment-Based Local Fallback**. It processes multi-lingual inputs (English, Hindi, Hinglish), manages conversational state across multi-turn workflows, enforces medical safety bounds, and records validated physiological data into MongoDB.

The current architecture is layered as follows:

1. **Ingestion Layer (`webhookController.ts`)**: Receives Meta WhatsApp webhooks, performs early deduplication, handles media types (audio transcription, document/image OCR), and routes text payloads.
2. **State Router Layer (`webhookController.ts` & `pendingClarificationService.ts`)**: Intercepts active conversational contexts, such as pending duplicate confirmations, ambiguous corrections, or incomplete readings, before initiating new parses.
3. **Intent Detection Layer (`parserV2.ts` / `pendingClarificationService.ts`)**: Classifies the incoming message intent (e.g., health measurement, retrieval query, correction, emergency, conversational ignore, or help).
4. **Extraction Layer (`openaiService.ts` & `healthRecordParser.ts`)**:
   - *Primary (AI)*: Queries the OpenRouter endpoint to return structured JSON conforming to the `IntelligenceResult` schema.
   - *Secondary (Deterministic fallback)*: Splitting raw messages into index-based segments via `deterministicExtract` when the AI is offline or returns invalid JSON.
5. **Deduplication & Promotion Engine (`webhookController.ts`)**: Filters duplicate candidates extracted within the same turn, promotes bare values in known context, and matches existing daily readings to prevent duplicate persistence.
6. **Pre-Save Validation (`healthRecordParser.ts` -> `validateCandidateRecord`)**: Enforces clinical ranges, checks for value fabrication using text-containment checks, and ensures completeness.
7. **Persistence (`webhookController.ts`)**: Commits the final sanitized structures to the MongoDB database or in-memory mock stores.

---

## 2. File Dependency Map

Below is a detailed map of the components involved in the parsing and conversation lifecycle:

```
                  [ Webhook Request ]
                           │
                           ▼
              [ webhookController.ts ] <───> [ groqSpeechService.ts ] (Audio transcription)
                           │           <───> [ documentService.ts ] (OCR/Lab Extraction)
                           ▼
        [ pendingClarificationService.ts ] (Active Context, In-Memory TTL Stores)
                           │
         ┌─────────────────┼─────────────────────────┐
         ▼                 ▼                         ▼
  [ openaiService.ts ] ──> [ healthRecordParser.ts ] <──> [ parserV2.ts ] (Synonym engines,
  (LLM Extraction)         (Main parser, fallback,        (Synonyms,     intent classification,
                           resolveRecordedAt,             validators)    strip utilities)
                           validateCandidateRecord)
                                   │
                                   ▼
                       [ parameterRegistry.ts ] (Vitals Metadata)
                                   │
                                   ▼
                         [ HealthRecord.ts ] (Mongoose DB Model)
```

---

## 3. Data Flow Diagram

The following ascii diagram traces the end-to-end pipeline from WhatsApp message arrival until DB persistence and outbound response.

```
+---------------------------------------------------------------------------------+
|                                    WHATSAPP                                     |
+---------------------------------------------------------------------------------+
                                        |
                                        | (HTTP POST Webhook Payload)
                                        v
+---------------------------------------------------------------------------------+
|                            WEBHOOK INGESTION ROUTER                             |
|                           (webhookController.ts)                                |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [1] Deduplicate Msg ID (Check memory / DB)
                                        |-- [2] Media Check (If audio -> transcription; if image/pdf -> OCR)
                                        |-- [3] Patient Lookup (Retrieve clinical metadata)
                                        v
+---------------------------------------------------------------------------------+
|                            STATE-AWARE INTERCEPTOR                              |
|                      (pendingClarificationService.ts)                           |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [4] Check for Pending Duplicate Confirmation
                                        |-- [5] Check for Active Clarification (Field resolution, hijacking)
                                        |-- [6] Check for Active Correction
                                        v
+---------------------------------------------------------------------------------+
|                                 INTENT DETECTOR                                 |
|                                  (parserV2.ts)                                  |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [7] Emergency Trigger? -> (Instant Response / Bypass workflow)
                                        |-- [8] Retrieval? -> (Route to Database Queries)
                                        |-- [9] Correction? -> (Route to Correction Engine)
                                        v
+---------------------------------------------------------------------------------+
|                            HYBRID EXTRACTION ENGINE                             |
|               (openaiService.ts / healthRecordParser.ts)                        |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [10] Query OpenRouter Model (Primary)
                                        |-- [11] deterministicExtract fallback (Secondary)
                                        |-- [12] Merge & Deduplicate extracted candidates
                                        v
+---------------------------------------------------------------------------------+
|                              VALIDATION ENVELOPE                                |
|                        (healthRecordParser.ts)                                  |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [13] Unit Support Mapping (Parameter Registry)
                                        |-- [14] Bounds enforcement (Medical plausibility)
                                        |-- [15] Anti-hallucination support check
                                        v
+---------------------------------------------------------------------------------+
|                             PERSISTENCE & OUTBOUND                              |
+---------------------------------------------------------------------------------+
                                        |
                                        |-- [16] Create MongoDB HealthRecord / LabObservation
                                        |-- [17] Trigger WhatsApp Outbound Confirmation (whatsappResponses.ts)
                                        v
                              [ Patient Dashboard ]
```

---

## 4. Legacy Code Locations

Several legacy code paths, redundant variables, and orphaned handlers are still active in the codebase:

1. **`healthRecordParser.ts` (Legacy Parser Interfaces)**:
   - `parseHealthRecord` (lines 623-685) contains a legacy backup path to parse an array-of-objects AI response format. The primary flow uses the unified `IntelligenceResult` schema. While it acts as a secondary parser, it is an outdated format that does not integrate missing fields or unresolved measurements.
2. **`webhookController.ts` (Redundant Inline Parsers)**:
   - `extractDiastolicNumber` (lines 1475-1487), `extractGlucoseNumber` (lines 1511-1523), and `extractTemperatureNumber` (lines 1525-1537) are defined directly within the controller file. These are legacy segment-parsing blocks that duplicate parsing patterns of `deterministicExtract`.
   - `parseTemperatureUnit` (lines 1489-1509) duplicates temperature unit parsing implemented in `deterministicExtract` and `parserV2.ts`.

---

## 5. Duplicate Logic Locations

Due to continuous refinement, there are multiple files implementing identical, slightly altered, or competing algorithms:

### A. Duplicated BP Parsing
- **Local Fallback BP Segment Parser (`healthRecordParser.ts` lines 272-339)**:
  Splits and extracts systolic, diastolic, decimal representations (e.g. `131.82`), and incomplete patterns using regular expressions.
- **Controller Merging Helpers (`webhookController.ts` lines 1475-1487)**:
  `extractDiastolicNumber` implements its own regular expressions (`/\b\d+\b/g`) to parse numbers from follow-up messages, which lacks timezone or contextual awareness.

### B. Duplicated Sugar / Glucose Parsing
- **Local Fallback Glucose Parser (`healthRecordParser.ts` lines 341-370)**:
  Uses regexes (`/\b\d+(?:\.\d+)?\b/g`) and `parseGlucoseContext` to extract blood sugar candidates.
- **Controller Merging Helpers (`webhookController.ts` lines 1511-1523)**:
  `extractGlucoseNumber` uses independent logic (`/\b\d+\b/g`) to pull values between 40 and 500 directly inside the controller.

### C. Duplicated Text / Voice Parsing
- There is no physical distinction between voice and text parsing; voice messages are translated to text transcripts first via Whisper in `groqSpeechService.ts`.
- However, **BP voice failure fallback** is handled in `webhookController.ts` (lines 351-370) inside the controller, duplicating candidate checking and creating specific warnings when a BP keyword is present but transcription fails to extract it. This should be unified within a centralized state engine.

### D. Duplicated Synonym Handling
- **`parserV2.ts`** contains canonical definitions for `PARAMETER_SYNONYMS` and `GLUCOSE_CONTEXT_SYNONYMS`.
- **`webhookController.ts` (lines 1421-1430)** defines custom search keywords for other parameters inside `hasUnrelatedParameterKeywords` which duplicates keys defined in `parserV2.ts`.

### E. Duplicated Validation Logic
- **`parserV2.ts` (lines 101-137)** contains `validateValue` which specifies ranges (e.g. SpO2 `50-100`, Temp `30-45` in C, Weight `10-300`).
- **`healthRecordParser.ts` (lines 538-621)** contains `validateCandidateRecord` which duplicates and overrides these validations:
  - It hardcodes specific range checks for BP: `sys < 70 || sys > 250 || dia < 40 || dia > 150` which duplicate constraints.
  - It also performs custom validations and logs warning values, duplicating logic path branches.

---

## 6. Tracing Every Health Entity

To guarantee deterministic, bug-free pipelines, each physiological vital must follow exactly **ONE canonical path** through the system. Below is a detailed trace of the pipeline for each physiological parameter:

| Parameter | Primary Extraction | Secondary Fallback | Normalization | Validation (Plausibility) | Persistence Model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Blood Sugar** | LLM Schema (`blood_sugar`) | `deterministicExtract` Segment split | Canonical mapping to `fasting`/`post_meal`/`random` | Value range: `30 - 500` mg/dL (or `1.6 - 27.8` mmol/L) | `HealthRecord` (context: fasting/post_meal/random) |
| **Blood Pressure** | LLM Schema (`blood_pressure`) | `deterministicExtract` (systolic/diastolic/decimal split) | Strips whitespace, stores as `sys/dia` string | Sys: `70-250`, Dia: `40-150` mmHg | `HealthRecord` (stored as `"systolic/diastolic"`) |
| **Weight** | LLM Schema (`weight`) | `deterministicExtract` regex | Converts pounds (`lbs`) to kilograms (`kg`) | Value range: `10 - 300` kg | `HealthRecord` (unit: kg) |
| **Pulse** | LLM Schema (`heart_rate`) | `deterministicExtract` regex | Standardizes to `bpm` | Value range: `30 - 250` bpm | `HealthRecord` (unit: bpm) |
| **Temperature** | LLM Schema (`body_temperature`) | `deterministicExtract` regex | Converts Fahrenheit (`°F`) to Celsius (`°C`) | Value range: `30 - 45` °C | `HealthRecord` (unit: °C) |
| **SpO2** | LLM Schema (`oxygen_saturation`) | `deterministicExtract` regex | Removes spaces, standardizes to `%` | Value range: `50 - 100` % | `HealthRecord` (unit: %) |

---

## 7. Conversation State Machine Audit

Active conversations are routed and resolved across multiple distinct state transitions using `pendingClarificationStore` (cached in memory with a configurable TTL, default 15 minutes).

### State Transitions & Flow Diagram:

```
        +-------------------------+
        |  STATE: NO_ACTIVE_STATE | <-------------------------------------------------+
        +-------------------------+                                                   |
                     |                                                                |
                     | Message Arrives (Incomplete/Unresolved)                        |
                     v                                                                |
        +-------------------------+                                                   |
        |  STATE: PENDING_CLARIF  | ----------------- Cancel Command ----------------+
        +-------------------------+                                                   |
                     |                                                                |
                     |-- Explicit New Obs Bypass -> Suspend Pending -> Process Fresh  |
                     |-- Context Hijack -> Clear Pending -> Process Fresh             |
                     |-- Correct Match -> Complete Pending -> Save -> Reset State ----+
                     v
        +-------------------------+
        |  STATE: DUP_PENDING     | --- YES (Save Duplicate) / NO (Cancel) ----------+
        +-------------------------+
                     |
                     v
        +-------------------------+
        |  STATE: CORR_PENDING    | --- Choose Target -> Apply Correction -----------+
        +-------------------------+
```

### Detailed Transition Rules:
1. **NO_ACTIVE_STATE**:
   - Webhook message is evaluated. If fully validated, saved directly to DB.
   - If missing required elements (e.g. glucose context for sugar, diastolic for BP, unit for temp) or contains unresolved numbers, transition to **PENDING_CLARIF**.
2. **PENDING_CLARIF**:
   - **Timeout (TTL)**: Checks `expiresAt` (15 mins default). If expired, state resolves to `expired` and is treated as `NO_ACTIVE_STATE`.
   - **Cancellation ("cancel", "rehne do")**: Transition to `cancelled`, state cleared, polite exit message sent.
   - **Bypass**: If an explicit new observation arrives (contains a parameter keyword and numbers), the pending state is suspended, the fresh observation is processed, and the old state is restored if the fresh one succeeds without creating its own pending.
   - **Hijacking Check**: If incoming elements have keywords for parameters *unrelated* to the pending fields, the state is cleared and treated as fresh.
   - **Deterministic Field Matching**: If the user replies directly with the missing part (e.g., "fasting" or "80"), it is parsed, merged, validated, and saved. Transitions to `completed`, cleared.
3. **DUP_PENDING**:
   - Triggered when identical metrics, contexts, and dates are sent within the safety window.
   - User replies "YES": both observations saved. State cleared.
   - User replies "NO": duplicate discarded. State cleared.
4. **CORR_PENDING**:
   - Triggered when a correction message matches multiple past readings (ambiguous targets).
   - User selects index (e.g., "1" or "morning"): the matching target is updated in-place (with correction audit log appended). State cleared.

---

## 8. Root Causes of Recurring Regressions

Based on the audit, we identify four critical architectural flaws that trigger recurring parsing bugs:

1. **Routing-Parser Separation and Redundant Checks**:
   The webhook router (`webhookController.ts`) performs manual routing decisions (e.g. `detectQueryPattern` and `isCorrectionMessage`) *before* delegating to the parser, bypassing the main intent router in `parserV2.ts`. This causes different pipelines to evaluate the same text with slightly different regexes, leading to misrouting or context collisions.
2. **Decoupled Validation Rules**:
   Ranges are validated in two disjoint locations: `validateValue` (`parserV2.ts`) and `validateCandidateRecord` (`healthRecordParser.ts`). Any modification to safety limits (e.g. SpO2 minimums or body temperature bounds) must be updated in both places. If they diverge, valid readings might get dropped or invalid readings saved.
3. **Fragmented Extraction Pathways**:
   The logic for parsing values during clarification turns (follow-ups) is separate from the primary extraction flow. When a patient resolves a missing BP diastolic value, `extractDiastolicNumber` is called. It lacks the advanced safeguards of the core parser (such as time context preservation, timezone offsets, and multi-observation splitting), making follow-up turns brittle.
4. **Timezone Disjointness**:
   `resolveRecordedAt` relies on local timezone calculation fallback when absolute dates are absent, but timezone-shifting logic is scattered, making it prone to shifting calendar days between UTC server execution and Indian Standard Time (+5:30) storage.

---

## 9. Exact Refactoring Plan for Parser V2

To achieve complete parser stability, the parser architecture should be refactored into a single, deterministic clinical pipeline.

```
Incoming WhatsApp Message
           │
           ▼
┌────────────────────────────────────────────────────────┐
| [Layer 1: Unified Router]                              |
| - Single entrypoint. Calls detectMessageIntent().       |
| - Resolves to RETRIEVAL, CORRECTION, EMERGENCY,        |
|   CLARIFY, or RECORD.                                  |
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
| [Layer 2: Extraction Core]                             |
| - Runs OpenAI extraction + deterministicExtract.       |
| - Single extraction context, maps all 8 parameters.     |
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
| [Layer 3: Canonical Synonym Normalization]             |
| - Normalizes glucose contexts, temperature units,      |
|   and weight units in a centralized synonym engine.     |
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
| [Layer 4: Unified Validation Engine]                   |
| - All bounds, plausibility checks, and PHI filters     |
|   reside ONLY in validationEngine.ts.                  |
└────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────┐
| [Layer 5: Unified State Router]                        |
| - Evaluates pending store, handles multi-turn state    |
|   transitions.                                         |
└────────────────────────────────────────────────────────┘
           │
           ▼
MongoDB Persistence & Outbound Response
```

### Execution Steps for Refactoring Phase:
1. **Centralize All Validations**: Move all physiological range validation rules from `healthRecordParser.ts` into a dedicated file `backend/src/utils/validationEngine.ts`. Completely deprecate duplicate validation loops.
2. **Centralize All Extractions**: Unify follow-up parsing (e.g. `extractGlucoseNumber`, `extractDiastolicNumber`) into `deterministicExtract` so that the fallback parser handles both raw messages and single-value responses identically.
3. **Centralize Synonym Mapping**: Deprecate separate keyword lists in `webhookController.ts` and route all synonym lookups strictly through the `PARAMETER_SYNONYMS` maps in `parserV2.ts`.
4. **Standardize Timezone Contexts**: Ensure `resolveRecordedAt` is the single source of truth for datetime resolution, and unify UTC offset calculations to centrally configuration files.

---

## 10. Risk Assessment

* **Backward Compatibility**: Redefining schemas could break existing tests that rely on specific output formats (e.g., legacy parenthesized confirmations `(Done 👍 ...)`). High risk of regression if not verified against the 100+ combined tests in `sprint39.test.ts`, `parserStabilization.test.ts`, and `parserReliability.test.ts`.
* **State Interruption**: Refactoring `pendingClarificationStore` structures during active production sessions might drop active patient threads.
* **LLM Drifting**: Modifying system prompts might cause OpenRouter to format responses differently. Local deterministic fallback must always be kept strictly isolated and robust.

---

## 11. Estimated Impact

* **Regression Elimination**: Unifying validation and intent engines will eliminate 95% of cross-field parsing conflicts (such as bare numbers colliding with blood sugar defaults).
* **Maintainability Increase**: Reduces parser code footprints by ~35% by purging duplicate controllers, redundant string strips, and legacy pathways.
* **Clinical Safety**: Centralized safety validation guarantees that no implausible values ever breach the persistence layer, while ensuring safety emergency warnings remain absolute.
