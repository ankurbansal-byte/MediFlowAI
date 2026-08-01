import { PARAMETER_REGISTRY } from "./parameterRegistry";
import { IntelligenceResult, CandidateRecord, GlucoseContext } from "./intelligenceContract";
import { HealthRecord } from "../services/healthRecordExtractor";

/**
 * Helper to detect user language style
 */
export function detectLanguageStyle(text: string): "english" | "hindi" | "hinglish" {
  const clean = text.toLowerCase();
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }
  const hinglishWords = [
    "hai", "thi", "tha", "mer", "mera", "meri", "ko", "ki", "ka", "pehle", "baad", "aur", "hota", "bata", "bataiye", "liya", "diye", "gaya", "gayi", "ho", "aaj", "kal", "subah", "dopahar", "shaam", "raat", "chal", "kya", "sath", "se", "rehne", "do", "kabhi"
  ];
  const words = clean.split(/\s+/);
  const hasHinglish = words.some(w => hinglishWords.includes(w));
  if (hasHinglish) {
    return "hinglish";
  }
  return "english";
}

export function detectEmergencyUrgency(message: string): "emergency" | null {
  const clean = message.toLowerCase().trim();

  // Robust negation/historical false-positive protections:
  const negationPhrases = [
    "no chest pain",
    "no breathing",
    "not having",
    "past",
    "historical",
    "kal tha",
    "kal thi",
    "kal thaa",
    "doctor ko dikha",
    "doctor ko dikhaya",
    "doctor ko bol",
    "now fine",
    "now better",
    "now ok",
    "theek hai",
    "thik hai",
    "theek hoon",
    "thik hoon",
    "breathing rate",
    "respiratory rate"
  ];

  if (negationPhrases.some(phrase => clean.includes(phrase))) {
    return null;
  }

  // 1. Chest pain detection (English/Hindi/Hinglish)
  const isChestPain =
    clean.includes("chest pain") ||
    ((clean.includes("seene") || clean.includes("chhati") || clean.includes("dil") || clean.includes("chati") || clean.includes("सीने") || clean.includes("छाती") || clean.includes("दिल")) &&
     (clean.includes("pain") || clean.includes("dard") || clean.includes("दर्द")));

  // 2. Breathing difficulty detection
  const isBreathingDifficulty =
    clean.includes("difficulty breathing") ||
    clean.includes("can't breathe") ||
    clean.includes("cannot breathe") ||
    (clean.includes("saans") && (clean.includes("takleef") || clean.includes("dikkat") || clean.includes("pareshani") || clean.includes("phool") || clean.includes("nahi") || clean.includes("nahin") || clean.includes("nhi"))) ||
    (clean.includes("सांस") && (clean.includes("तकलीफ") || clean.includes("दिक्कत") || clean.includes("परेशानी") || clean.includes("कठिनाई") || clean.includes("फूल") || clean.includes("नहीं") || clean.includes("नही")));

  // 3. Unconsciousness detection
  const isUnconscious =
    clean.includes("unconscious") ||
    clean.includes("behoshi") ||
    clean.includes("behosh") ||
    clean.includes("बेहोश") ||
    clean.includes("बेहोशी");

  // 4. Severe bleeding detection
  const isBleeding =
    clean.includes("severe bleeding") ||
    clean.includes("heavy bleeding") ||
    clean.includes("khoon beh raha") ||
    clean.includes("खून बह रहा") ||
    clean.includes("भारी ब्लीडिंग") ||
    clean.includes("बहुत खून") ||
    (clean.includes("khoon") && clean.includes("bahut"));

  // 5. Stroke-like symptoms / sudden weakness with speech difficulty
  const isStrokeOrSpeech =
    clean.includes("stroke") ||
    clean.includes("speech difficulty") ||
    clean.includes("difficulty speaking") ||
    (clean.includes("sudden") && clean.includes("weakness")) ||
    (clean.includes("achanak") && clean.includes("kamzori")) ||
    (clean.includes("bolne") && (clean.includes("takleef") || clean.includes("dikkat") || clean.includes("difficulty"))) ||
    (clean.includes("बोलने") && (clean.includes("तकलीफ") || clean.includes("दिक्कत") || clean.includes("कठिनाई") || clean.includes("परेशानी")));

  if (isChestPain || isBreathingDifficulty || isUnconscious || isBleeding || isStrokeOrSpeech) {
    return "emergency";
  }

  return null;
}

export function detectParameterFromMessage(msg: string): string | null {
  const clean = msg.toLowerCase().trim();
  const keywordsMap: Record<string, string[]> = {
    blood_sugar: ["sugar", "glucose", "sugar level", "shugar", "cheeni", "schugar", "शुगर", "सीनी", "चीनी", "meri sugar", "mera sugar"],
    blood_pressure: ["bp", "blood pressure", "pressure", "बीपी", "रक्तचाप", "mera bp", "meri bp"],
    heart_rate: ["pulse", "heart rate", "hr", "bpm", "dhadkan", "dil", "beat", "पल्स", "धड़कन"],
    oxygen_saturation: ["oxygen", "spo2", "o2", "saturation", "oxigen", "ऑक्सीजन", "ओक्सीजन", "ऑक्सिजन", "oxygen level"],
    body_temperature: ["temp", "temperature", "fever", "body temp", "bukhar", "bukhaar", "tapman", "तापमान", "बुखार"],
    weight: ["weight", "vajan", "wajan", "kg", "vazan", "वजन"],
    respiratory_rate: ["breath", "breathing", "breathing rate", "resp", "respiratory", "saans"],
    height: ["height", "lambai"]
  };

  for (const [param, keywords] of Object.entries(keywordsMap)) {
    for (const kw of keywords) {
      if (/[\u0900-\u097F]/.test(kw)) {
        if (clean.includes(kw)) {
          return param;
        }
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(clean)) {
          return param;
        }
      }
    }
  }

  return null;
}

/**
 * Parses glucose context deterministically from text
 */
export function parseGlucoseContext(msg: string): GlucoseContext | null {
  const clean = msg.toLowerCase().trim();

  // Fasting
  if (
    clean.includes("fasting") ||
    clean.includes("khali pet") ||
    clean.includes("khaali pet") ||
    clean.includes("खाली पेट") ||
    clean === "fast" ||
    clean === "fating" ||
    clean === "fastg" ||
    clean.includes("empty stomach") ||
    clean.includes("bina khaye") ||
    clean.includes("बिना खाए") ||
    clean.includes("बिना कुछ खाए")
  ) {
    return "fasting";
  }

  // Pre-meal / Before breakfast / Before lunch / Before dinner
  if (
    clean.includes("before food") ||
    clean.includes("before breakfast") ||
    clean.includes("before lunch") ||
    clean.includes("before dinner") ||
    clean.includes("before meal") ||
    clean.includes("pre-meal") ||
    clean.includes("pre_meal") ||
    clean.includes("premeal") ||
    clean.includes("khane se pehle") ||
    clean.includes("खाने से पहले") ||
    clean.includes("nashte se pehle") ||
    clean.includes("नाश्ते से पहले") ||
    clean.includes("lunch se pehle") ||
    clean.includes("लंच से पहले") ||
    clean.includes("dinner se pehle") ||
    clean.includes("डिनर से पहले") ||
    clean.includes("breakfast se pehle") ||
    clean.includes("dinner se pehle") ||
    clean.includes("bhojan se pehle") ||
    clean.includes("भोजन से पहले")
  ) {
    return "pre_meal";
  }

  // Post-meal / After breakfast / After lunch / After dinner
  if (
    clean.includes("after food") ||
    clean.includes("after breakfast") ||
    clean.includes("after lunch") ||
    clean.includes("after dinner") ||
    clean.includes("after meal") ||
    clean.includes("after a meal") ||
    clean.includes("post-meal") ||
    clean.includes("post_meal") ||
    clean.includes("postmeal") ||
    clean.includes("khane ke baad") ||
    clean.includes("khana khane ke baad") ||
    clean.includes("khane ke 2 ghante baad") ||
    clean.includes("2 hours after meal") ||
    clean.includes("2 hrs after food") ||
    clean.includes("खाने के बाद") ||
    clean.includes("nashte ke baad") ||
    clean.includes("नाश्ते के बाद") ||
    clean.includes("lunch ke baad") ||
    clean.includes("लंच के बाद") ||
    clean.includes("dinner ke baad") ||
    clean.includes("डिनर के बाद") ||
    clean.includes("breakfast ke baad") ||
    clean.includes("meal ke baad") ||
    clean.includes("bhojan ke baad") ||
    clean.includes("भोजन के बाद")
  ) {
    return "post_meal";
  }

  // Random
  if (
    clean.includes("random") ||
    clean.includes("random tha") ||
    clean.includes("रैंडम")
  ) {
    return "random";
  }

  return null;
}

/**
 * Local deterministic extraction function to recognize explicit vitals in English, Hindi and Hinglish.
 * Serves as fallback when the AI provider fails.
 */
export function isCorrectionMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim();
  const keywords = [
    "nahi", "nahin", "galat", "wrong", "mistake", "sorry", "instead of", "correct",
    "नहीं", "गलत", "सुधार", "बदले", "correction", "edit", "change", "kar do", "ki jagah", "की जगह", "actual", "actually"
  ];
  const hasKeyword = keywords.some(kw => clean.includes(kw));
  const hasNumbers = /\b\d+\b/.test(clean);
  const comparisonPattern = /\b\d+\s*(?:nahi|nahin|instead\s*of|not|galat|नहीं|ki\s*jagah|की\s*जगह)\s*\d+\b/i.test(clean);
  const hasParam = detectParameterFromMessage !== undefined && detectParameterFromMessage(msg) !== null;
  const hasGlucoseCtx = parseGlucoseContext !== undefined && parseGlucoseContext(msg) !== null;

  return hasKeyword && (hasNumbers || comparisonPattern || hasParam || hasGlucoseCtx);
}

export interface ParsedCorrection {
  parameter: string | null;
  oldValue: string | number | null | undefined;
  newValue: string | number | null | undefined;
  oldContext: GlucoseContext | null;
  newContext: GlucoseContext | null;
  oldTimeContext?: "morning" | "afternoon" | "evening" | "night" | null;
  newTimeContext?: "morning" | "afternoon" | "evening" | "night" | null;
  originalRecordedAt?: Date | null;
}

export function parseCorrectionMessage(msg: string): ParsedCorrection {
  const clean = msg.toLowerCase().trim();
  const param = detectParameterFromMessage(msg);

  const cleanedMsg = stripNumbersBelongingToDatesAndTimes(msg);
  const valueRegex = /(\b\d{2,3}\s*[\/\\]\s*\d{2,3}\b|\b\d+(?:\.\d+)?\b)/g;
  const allValues = cleanedMsg.match(valueRegex) || [];

  let oldValue: string | number | null | undefined = null;
  let newValue: string | number | null | undefined = null;
  let oldContext: GlucoseContext | null = null;
  let newContext: GlucoseContext | null = null;
  let oldTimeContext: "morning" | "afternoon" | "evening" | "night" | null = null;
  let newTimeContext: "morning" | "afternoon" | "evening" | "night" | null = null;

  const splitKeywords = [
    "instead of",
    "ki jagah",
    "की जगह",
    "nahi",
    "nahin",
    "नहीं",
    "galat",
    "wrong",
    "गलत"
  ];

  let foundKeyword: string | null = null;
  for (const kw of splitKeywords) {
    if (clean.includes(kw)) {
      foundKeyword = kw;
      break;
    }
  }

  // Extract timeContext helper
  const extractTimeContextLocal = (text: string): "morning" | "afternoon" | "evening" | "night" | null => {
    const cleanSeg = text.toLowerCase();
    if (cleanSeg.includes("morning") || cleanSeg.includes("subah") || cleanSeg.includes("सुबह")) {
      return "morning";
    }
    if (cleanSeg.includes("evening") || cleanSeg.includes("shaam") || cleanSeg.includes("शाम")) {
      return "evening";
    }
    if (cleanSeg.includes("afternoon") || cleanSeg.includes("dopahar") || cleanSeg.includes("दोपहर")) {
      return "afternoon";
    }
    if (cleanSeg.includes("night") || cleanSeg.includes("raat") || cleanSeg.includes("रात")) {
      return "night";
    }
    return null;
  };

  if (foundKeyword) {
    const idx = clean.indexOf(foundKeyword);
    const part1 = clean.substring(0, idx).trim();
    const part2 = clean.substring(idx + foundKeyword.length).trim();

    const part1Values = part1.match(valueRegex) || [];
    const part2Values = part2.match(valueRegex) || [];

    if (foundKeyword === "instead of") {
      newContext = parseGlucoseContext(part1);
      oldContext = parseGlucoseContext(part2);
      newTimeContext = extractTimeContextLocal(part1);
      oldTimeContext = extractTimeContextLocal(part2);
      if (part1Values.length > 0 && part2Values.length > 0) {
        newValue = part1Values[0];
        oldValue = part2Values[0];
      } else if (allValues.length === 2) {
        newValue = allValues[0];
        oldValue = allValues[1];
      } else if (allValues.length === 1) {
        newValue = allValues[0];
      }
    } else {
      oldContext = parseGlucoseContext(part1);
      newContext = parseGlucoseContext(part2);
      oldTimeContext = extractTimeContextLocal(part1);
      newTimeContext = extractTimeContextLocal(part2);
      if (part1Values.length > 0 && part2Values.length > 0) {
        oldValue = part1Values[0];
        newValue = part2Values[0];
      } else if (allValues.length === 2) {
        oldValue = allValues[0];
        newValue = allValues[1];
      } else if (allValues.length === 1) {
        newValue = allValues[0];
      }
    }
  } else {
    if (allValues.length === 2) {
      oldValue = allValues[0];
      newValue = allValues[1];
    } else if (allValues.length === 1) {
      newValue = allValues[0];
    }
  }

  // If time contexts weren't parsed from parts, fallback to whole message
  const msgTimeContext = extractTimeContextLocal(clean);
  if (!oldTimeContext && msgTimeContext) oldTimeContext = msgTimeContext;
  if (!newTimeContext && msgTimeContext) newTimeContext = msgTimeContext;

  // If glucose contexts weren't parsed from parts, fallback to whole message
  const msgGlucoseContext = parseGlucoseContext(clean);
  if (!oldContext && msgGlucoseContext) oldContext = msgGlucoseContext;
  if (!newContext && msgGlucoseContext) newContext = msgGlucoseContext;

  // Convert bp pairs nicely (strip whitespace around / or \)
  const formatBp = (val: string | number | null | undefined): string | number | null | undefined => {
    if (typeof val === "string" && (val.includes("/") || val.includes("\\"))) {
      return val.replace(/\s*[\/\\]\s*/g, "/");
    }
    return val;
  };

  return {
    parameter: param,
    oldValue: formatBp(oldValue),
    newValue: formatBp(newValue),
    oldContext,
    newContext,
    oldTimeContext,
    newTimeContext
  };
}

export function deterministicExtract(message: string): any {
  const clean = message.toLowerCase().trim();
  const lang = detectLanguageStyle(message);

  const result: any = {
    language: lang,
    action: "IGNORE",
    intent: "conversational",
    candidateRecords: [],
    missingFields: [],
    unresolvedMeasurements: [],
    reason: "Deterministic local fallback extraction"
  };

  const keywordMap: Record<string, string[]> = {
    blood_sugar: ["sugar level", "sugar", "glucose", "shugar", "cheeni", "schugar", "शुगर", "सीनी", "चीनी", "meri sugar", "mera sugar"],
    blood_pressure: ["blood pressure", "pressure", "bp", "बीपी", "रक्तचाप", "mera bp", "meri bp", "ब्लड प्रेशर"],
    heart_rate: ["heart rate", "pulse", "hr", "bpm", "dhadkan", "dil", "beat", "पल्स", "धड़कन", "नाड़ी"],
    oxygen_saturation: ["oxygen saturation", "oxygen level", "oxygen", "spo2", "o2", "saturation", "oxigen", "ऑक्सीजन", "ओक्सीजन", "ऑक्सिजन"],
    body_temperature: ["body temp", "temp", "temperature", "fever", "bukhar", "bukhaar", "tapman", "तापमान", "बुखार", "बुख़ार"],
    weight: ["weight", "vajan", "wajan", "kg", "vazan", "वजन", "वज़न"],
    respiratory_rate: ["breathing rate", "breathing", "breath", "resp", "respiratory", "rr", "saans", "सांस की दर"],
    height: ["height", "lambai", "kad", "हाइट", "लंबाई", "कद"]
  };

  function findKeywordMatches(text: string): { param: string; index: number; keyword: string }[] {
    const matches: { param: string; index: number; keyword: string }[] = [];
    const cleanText = text.toLowerCase();

    for (const [param, keywords] of Object.entries(keywordMap)) {
      for (const kw of keywords) {
        const isDevanagari = /[\u0900-\u097F]/.test(kw);
        if (isDevanagari) {
          let startPos = 0;
          while ((startPos = cleanText.indexOf(kw, startPos)) !== -1) {
            matches.push({ param, index: startPos, keyword: kw });
            startPos += kw.length;
          }
        } else {
          const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedKw}\\b`, "gi");
          let match;
          while ((match = regex.exec(cleanText)) !== null) {
            matches.push({ param, index: match.index, keyword: kw });
          }
        }
      }
    }

    matches.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.keyword.length - a.keyword.length;
    });

    const filteredMatches: typeof matches = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.index >= lastEnd) {
        filteredMatches.push(m);
        lastEnd = m.index + m.keyword.length;
      }
    }

    return filteredMatches;
  }

  function extractTemporalInfo(text: string): string | null {
    const cleanSeg = text.toLowerCase();
    const timeMatch = cleanSeg.match(/\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)\b/i);
    if (timeMatch) {
      return timeMatch[0];
    }
    if (cleanSeg.includes("morning") || cleanSeg.includes("subah") || cleanSeg.includes("सुबह")) {
      return "morning";
    }
    if (cleanSeg.includes("evening") || cleanSeg.includes("shaam") || cleanSeg.includes("शाम")) {
      return "evening";
    }
    if (cleanSeg.includes("afternoon") || cleanSeg.includes("dopahar") || cleanSeg.includes("दोपहर")) {
      return "afternoon";
    }
    if (cleanSeg.includes("night") || cleanSeg.includes("raat") || cleanSeg.includes("रात")) {
      if (cleanSeg.includes("yesterday") || cleanSeg.includes("kal")) {
        return "yesterday night";
      }
      return "night";
    }
    if (cleanSeg.includes("yesterday") || cleanSeg.includes("kal") || cleanSeg.includes("कल")) {
      return "yesterday";
    }
    return null;
  }

  function extractTimeContext(text: string): "morning" | "afternoon" | "evening" | "night" | undefined {
    const cleanSeg = text.toLowerCase();
    if (cleanSeg.includes("morning") || cleanSeg.includes("subah") || cleanSeg.includes("सुबह")) {
      return "morning";
    }
    if (cleanSeg.includes("evening") || cleanSeg.includes("shaam") || cleanSeg.includes("शाम")) {
      return "evening";
    }
    if (cleanSeg.includes("afternoon") || cleanSeg.includes("dopahar") || cleanSeg.includes("दोपहर")) {
      return "afternoon";
    }
    if (cleanSeg.includes("night") || cleanSeg.includes("raat") || cleanSeg.includes("रात")) {
      return "night";
    }
    return undefined;
  }

  function hasConflictingParameterKeywords(text: string, currentParam: string): boolean {
    const cleanSeg = text.toLowerCase();
    for (const [param, keywords] of Object.entries(keywordMap)) {
      if (param === currentParam) continue;
      for (const kw of keywords) {
        const isDevanagari = /[\u0900-\u097F]/.test(kw);
        if (isDevanagari) {
          if (cleanSeg.includes(kw)) {
            return true;
          }
        } else {
          const rx = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
          if (rx.test(cleanSeg)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  const rawClauses = message.split(/[\n,;।।]|\b(?:and|aur|or|&|\+|then|fir|phir)\b|(?:^|\s+)(?:था|और)(?:\s+|$)/i);
  const subClauses: { param: string | null; text: string }[] = [];

  for (const rawClause of rawClauses) {
    const trimmedClause = rawClause.trim();
    if (!trimmedClause) continue;

    const matches = findKeywordMatches(trimmedClause);
    if (matches.length > 0) {
      if (matches[0].index > 0) {
        subClauses.push({
          param: null,
          text: trimmedClause.substring(0, matches[0].index)
        });
      }
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : trimmedClause.length;
        subClauses.push({
          param: matches[i].param,
          text: trimmedClause.substring(start, end)
        });
      }
    } else {
      subClauses.push({
        param: null,
        text: trimmedClause
      });
    }
  }

  const resolvedSubClauses: { param: string | null; text: string }[] = [];
  let runningParameter: string | null = null;

  for (const sub of subClauses) {
    let resolvedParam = sub.param;
    const trimmedSeg = sub.text.trim();
    if (!trimmedSeg) continue;

    const cleanedSegment = stripNumbersBelongingToDatesAndTimes(trimmedSeg);
    const hasStandaloneBpPattern = /\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/.test(cleanedSegment);

    if (resolvedParam) {
      runningParameter = resolvedParam;
    } else if (hasStandaloneBpPattern) {
      resolvedParam = "blood_pressure";
      runningParameter = "blood_pressure";
    } else if (runningParameter && !hasConflictingParameterKeywords(trimmedSeg, runningParameter)) {
      resolvedParam = runningParameter;
    }

    resolvedSubClauses.push({
      param: resolvedParam,
      text: trimmedSeg
    });
  }

  const candidateRecords: any[] = [];
  const missingFields: string[] = [];

  for (const seg of resolvedSubClauses) {
    if (seg.param === null) continue;

    const segmentText = seg.text;
    const segmentParam = seg.param;
    const cleanedSegment = stripNumbersBelongingToDatesAndTimes(segmentText);

    const tempInfo = extractTemporalInfo(segmentText) || extractTemporalInfo(message);
    const tContext = extractTimeContext(segmentText) || extractTimeContext(message);

    if (segmentParam === "blood_pressure") {
      let bpMatched = false;
      const decimalBpMatch = cleanedSegment.match(/\b(\d{2,3})\.(\d{2,3})\b/);
      if (decimalBpMatch) {
        const systolic = parseInt(decimalBpMatch[1], 10);
        let diastolicStr = decimalBpMatch[2];
        if (diastolicStr.length === 1) {
          diastolicStr += "0";
        }
        const diastolic = parseInt(diastolicStr, 10);
        if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
          candidateRecords.push({
            parameter: "blood_pressure",
            systolic,
            diastolic,
            unit: "mmHg",
            recordedAt: tempInfo,
            timeContext: tContext || undefined,
            confidence: 0.99
          });
          bpMatched = true;
        }
      }

      if (!bpMatched) {
        const bpGlobalRegex = /\b(\d{2,3})\s*(?:\/|\\|by|over|and|aur|\s+)\s*(\d{2,3})\b/gi;
        let bpMatch;
        while ((bpMatch = bpGlobalRegex.exec(cleanedSegment)) !== null) {
          const systolic = parseInt(bpMatch[1], 10);
          const diastolic = parseInt(bpMatch[2], 10);
          if (systolic >= 10 && systolic <= 1000 && diastolic >= 10 && diastolic <= 1000) {
            candidateRecords.push({
              parameter: "blood_pressure",
              systolic,
              diastolic,
              unit: "mmHg",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
            bpMatched = true;
          }
        }
      }

      if (!bpMatched) {
        const incompleteBpRegex = /(?:bp|blood\s*pressure|pressure|बीपी|रक्तचाप|ब्लड प्रेशर)(?:[^0-9\n]*)\b(\d{2,3})\b/i;
        const match = cleanedSegment.match(incompleteBpRegex);
        if (match) {
          const systolic = parseInt(match[1], 10);
          if (systolic >= 10 && systolic <= 1000) {
            candidateRecords.push({
              parameter: "blood_pressure",
              systolic,
              unit: "mmHg",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
            missingFields.push("diastolic");
          }
        }
      }
    }

    else if (segmentParam === "blood_sugar") {
      const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
      for (const numStr of numbersInSeg) {
        const val = parseFloat(numStr);
        if (val >= 1 && val <= 2000) {
          const context = parseGlucoseContext(segmentText) || parseGlucoseContext(message);
          if (context) {
            candidateRecords.push({
              parameter: "blood_sugar",
              value: val,
              unit: "mg/dL",
              context: context,
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          } else {
            candidateRecords.push({
              parameter: "blood_sugar",
              value: val,
              unit: "mg/dL",
              context: "unknown",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
            missingFields.push("glucose_context");
          }
        }
      }
    }

    else if (segmentParam === "heart_rate") {
      const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
      for (const numStr of numbersInSeg) {
        const val = parseInt(numStr, 10);
        if (val >= 1 && val <= 1000) {
          candidateRecords.push({
            parameter: "heart_rate",
            value: val,
            unit: "bpm",
            recordedAt: tempInfo,
            timeContext: tContext || undefined,
            confidence: 0.99
          });
        }
      }
    }

    else if (segmentParam === "oxygen_saturation") {
      const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
      for (const numStr of numbersInSeg) {
        const val = parseInt(numStr, 10);
        if (val >= 1 && val <= 300) {
          candidateRecords.push({
            parameter: "oxygen_saturation",
            value: val,
            unit: "%",
            recordedAt: tempInfo,
            timeContext: tContext || undefined,
            confidence: 0.99
          });
        }
      }
    }

    else if (segmentParam === "body_temperature") {
      const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
      for (const numStr of numbersInSeg) {
        const val = parseFloat(numStr);
        if (val >= 1 && val <= 500) {
          let tempUnit: string | null = null;
          const hasExplicitC = /\b(?:°?c|celsius|celcius)\b/i.test(segmentText) || segmentText.includes("°c") || segmentText.includes("celsius") || segmentText.includes("सेल्सियस");
          const hasExplicitF = /\b(?:°?f|fahrenheit|farenheit)\b/i.test(segmentText) || segmentText.includes("°f") || segmentText.includes("fahrenheit") || segmentText.includes("फ़ारेनहाइट") || segmentText.includes("फारेनहाइट");

          if (hasExplicitC) {
            tempUnit = "°C";
          } else if (hasExplicitF) {
            tempUnit = "°F";
          } else {
            if (val === 98.6) {
              tempUnit = "°F";
            } else {
              tempUnit = "unknown";
            }
          }

          if (tempUnit === "°F") {
            const celsiusVal = parseFloat(((val - 32) * 5 / 9).toFixed(1));
            candidateRecords.push({
              parameter: "body_temperature",
              value: celsiusVal,
              unit: "°C",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          } else if (tempUnit === "°C") {
            candidateRecords.push({
              parameter: "body_temperature",
              value: val,
              unit: "°C",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          } else {
            candidateRecords.push({
              parameter: "body_temperature",
              value: val,
              unit: "unknown",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
            missingFields.push("temperature_unit");
          }
        }
      }
    }

    else if (segmentParam === "weight") {
      const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
      for (const numStr of numbersInSeg) {
        const val = parseFloat(numStr);
        if (val >= -500 && val <= 1000) {
          const isLbs = segmentText.includes("lbs");
          if (isLbs) {
            const kgVal = parseFloat((val * 0.45359237).toFixed(1));
            candidateRecords.push({
              parameter: "weight",
              value: kgVal,
              unit: "kg",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          } else {
            candidateRecords.push({
              parameter: "weight",
              value: val,
              unit: "kg",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          }
        }
      }
    }

    else if (segmentParam === "respiratory_rate") {
      const isRrSymptomOnly = clean.includes("saans lene mein") || clean.includes("saans phool") || clean.includes("breathing difficulty") || clean.includes("shortness of breath");
      if (!isRrSymptomOnly) {
        const numbersInSeg = cleanedSegment.match(/\b\d+\b/g) || [];
        for (const numStr of numbersInSeg) {
          const val = parseInt(numStr, 10);
          if (val >= 1 && val <= 200) {
            candidateRecords.push({
              parameter: "respiratory_rate",
              value: val,
              unit: "breaths/min",
              recordedAt: tempInfo,
              timeContext: tContext || undefined,
              confidence: 0.99
            });
          }
        }
      }
    }

    else if (segmentParam === "height") {
      let heightValue: number | null = null;
      const feetInchesRegexes = [
        /\b(\d+)\s*'\s*(\d+)(?:"|in|inch|inches)?\b/i,
        /\b(\d+)\s*(?:feet|foot|ft|फ़ीट|फुट)\s*(\d+)\s*(?:inches|inch|in|इंच)?\b/iu
      ];
      for (const rx of feetInchesRegexes) {
        const match = segmentText.match(rx);
        if (match) {
          const ft = parseInt(match[1], 10);
          const inch = parseInt(match[2], 10);
          if (ft >= 3 && ft <= 8 && inch >= 0 && inch < 12) {
            heightValue = parseFloat(((ft * 12 + inch) * 2.54).toFixed(1));
            break;
          }
        }
      }

      if (heightValue === null) {
        const numbersInSeg = cleanedSegment.match(/\b\d+(?:\.\d+)?\b/g) || [];
        for (const numStr of numbersInSeg) {
          const val = parseFloat(numStr);
          if (val >= 10 && val <= 500) {
            heightValue = val;
            break;
          } else if (val >= 0.5 && val <= 2.5) {
            heightValue = parseFloat((val * 100).toFixed(1));
            break;
          }
        }
      }

      if (heightValue !== null) {
        candidateRecords.push({
          parameter: "height",
          value: heightValue,
          unit: "cm",
          recordedAt: tempInfo,
          timeContext: tContext || undefined,
          confidence: 0.99
        });
      }
    }
  }

  // Deduplicate candidateRecords
  const uniqueCandidates: any[] = [];
  for (const record of candidateRecords) {
    const isDup = uniqueCandidates.some(c => {
      if (c.parameter !== record.parameter) return false;
      if (c.parameter === "blood_pressure") {
        return c.systolic === record.systolic && c.diastolic === record.diastolic;
      }
      return c.value === record.value && c.context === record.context && c.timeContext === record.timeContext;
    });
    if (!isDup) {
      uniqueCandidates.push(record);
    }
  }

  const unresolved = findUnresolvedPlausibleNumbers(message, uniqueCandidates);

  if (uniqueCandidates.length > 0) {
    result.action = missingFields.length > 0 ? "CLARIFY" : "RECORD";
    result.intent = "health_measurement";
    result.candidateRecords = uniqueCandidates;
    result.missingFields = Array.from(new Set(missingFields));
    result.unresolvedMeasurements = unresolved;
  } else if (unresolved.length > 0) {
    result.action = "CLARIFY";
    result.intent = "ambiguous_health_message";
    result.candidateRecords = [];
    result.missingFields = [];
    result.unresolvedMeasurements = unresolved;
  }

  return result;
}

/**
 * Helper to strip numbers that are part of dates and times from the original message.
 * This prevents them from accidentally validating hallucinated measurement values.
 */
export function stripNumbersBelongingToDatesAndTimes(msg: string): string {
  let cleaned = msg.toLowerCase();

  // 1. Remove YYYY-MM-DD or standard ISO date parts (like 2026-07-11 or 2026-07-12)
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");

  // 2. Remove DD Month YYYY or DD Month
  const monthsPattern = "(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)";
  const ddMonthYyyyRegex = new RegExp(`\\b\\d{1,2}\\s+${monthsPattern}\\s*(?:\\d{2,4})?\\b`, "gi");
  cleaned = cleaned.replace(ddMonthYyyyRegex, "");

  // 3. Remove dates with slashes like DD/MM/YYYY or DD/MM/YY
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");

  // 4. Remove short slash dates like "20/07" only if it matches day <= 31 and month <= 12
  cleaned = cleaned.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (match, p1, p2) => {
    const d = parseInt(p1, 10);
    const m = parseInt(p2, 10);
    if (d <= 31 && m <= 12) {
      return "";
    }
    return match;
  });

  // 5. Remove times with colons/dots like 12:30 or 12.30 followed/preceded by am/pm/hours/minutes
  cleaned = cleaned.replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/gi, "");

  // 6. Remove numeric quantities representing durations or times (e.g., "2 hours", "10 min", "5 pm", "10am")
  cleaned = cleaned.replace(/\b\d+\s*(?:am|pm|hours|hrs|hr|minutes|mins|min|seconds|sec)\b/gi, "");

  return cleaned;
}

export function applyTimeStringToDate(date: Date, timeStr: string): Date {
  const clean = timeStr.toLowerCase().trim();
  const res = new Date(date);

  // Try 9:30 AM or 9.30 AM or 9:30 or 12:30 PM
  const colonMatch = clean.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/);
  if (colonMatch) {
    let hr = parseInt(colonMatch[1], 10);
    const min = parseInt(colonMatch[2], 10);
    const ampm = colonMatch[3];
    if (ampm === "pm" && hr < 12) hr += 12;
    if (ampm === "am" && hr === 12) hr = 0;
    res.setHours(hr, min, 0, 0);
    return res;
  }

  // Try 9 AM or 9am
  const simpleMatch = clean.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (simpleMatch) {
    let hr = parseInt(simpleMatch[1], 10);
    const ampm = simpleMatch[2];
    if (ampm === "pm" && hr < 12) hr += 12;
    if (ampm === "am" && hr === 12) hr = 0;
    res.setHours(hr, 0, 0, 0);
    return res;
  }

  return res;
}

/**
 * Deterministically resolves relative and historical dates from the original message.
 * Adjusted to handle Indian Timezone correctly and prevent fabrication of exact clock times.
 */
export function resolveRecordedAt(
  originalMessage: string,
  extractedRecordedAt: string | null | undefined,
  messageDate: Date = new Date()
): Date {
  const msgLower = originalMessage ? originalMessage.toLowerCase() : "";

  // 1. Check for absolute ISO date first to preserve precision if valid
  if (extractedRecordedAt) {
    const parsed = new Date(extractedRecordedAt);
    if (!isNaN(parsed.getTime())) {
      // Prevent LLM hallucination of hardcoded prompt examples (July 11/12)
      // unless those numbers/dates are explicitly in the user message
      const parsedIso = parsed.toISOString();
      const hallucinatedDates = ["2026-07-11", "2026-07-12"];
      const matchesHallucination = hallucinatedDates.some((hd) => parsedIso.startsWith(hd));
      let isHallucination = false;
      if (matchesHallucination) {
        const hasDateMention =
          msgLower.includes("11") ||
          msgLower.includes("12") ||
          msgLower.includes("july") ||
          msgLower.includes("jul");
        if (!hasDateMention) {
          isHallucination = true;
        }
      }
      if (!isHallucination) {
        const hasDateSeparator = extractedRecordedAt.includes("-") || extractedRecordedAt.includes("/");
        if (hasDateSeparator && extractedRecordedAt.length >= 8) {
          return parsed;
        }
      }
    }
  }

  // Get India/Hospital Timezone Offset in minutes
  const tzOffsetMinutes = process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES
    ? parseInt(process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES, 10)
    : 330; // IST: UTC+5:30 (330 minutes)

  // 2. Determine target day in patient's timezone
  const localTimeMs = messageDate.getTime() + (tzOffsetMinutes * 60 * 1000);
  const localDate = new Date(localTimeMs);
  const localYear = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth();
  const localDay = localDate.getUTCDate();
  const localHours = localDate.getUTCHours();
  const localMinutes = localDate.getUTCMinutes();
  const localSeconds = localDate.getUTCSeconds();
  const localMilliseconds = localDate.getUTCMilliseconds();

  let targetYear = localYear;
  let targetMonth = localMonth;
  let targetDay = localDay;
  let baseDateResolved = false;

  // Pattern: DD/MM/YYYY
  const slashDateMatch = originalMessage ? originalMessage.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/) : null;
  if (slashDateMatch) {
    targetDay = parseInt(slashDateMatch[1], 10);
    targetMonth = parseInt(slashDateMatch[2], 10) - 1; // 0-based
    targetYear = parseInt(slashDateMatch[3], 10);
    baseDateResolved = true;
  }

  if (!baseDateResolved) {
    // Pattern: DD/MM (like 20/07)
    const shortSlashDateMatch = originalMessage ? originalMessage.match(/\b(\d{1,2})\/(\d{1,2})\b/) : null;
    if (shortSlashDateMatch) {
      const first = parseInt(shortSlashDateMatch[1], 10);
      const second = parseInt(shortSlashDateMatch[2], 10);
      if (first <= 31 && second <= 12) {
        targetDay = first;
        targetMonth = second - 1;
        targetYear = localYear;
        baseDateResolved = true;
      }
    }
  }

  if (!baseDateResolved) {
    // Pattern: DD Month YYYY or DD Month (e.g., "20 July 2026" or "20 July")
    const monthsList = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
                        "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthsList.join("|")})\\s*(\\d{4})?\\b`, "i");
    const monthMatch = originalMessage ? originalMessage.match(monthRegex) : null;
    if (monthMatch) {
      targetDay = parseInt(monthMatch[1], 10);
      const monthStr = monthMatch[2].toLowerCase();
      let monthIdx = monthsList.indexOf(monthStr);
      if (monthIdx >= 12) monthIdx -= 12; // Handle shorthand months
      targetMonth = monthIdx;
      targetYear = monthMatch[3] ? parseInt(monthMatch[3], 10) : localYear;
      baseDateResolved = true;
    }
  }

  if (!baseDateResolved) {
    // Relative yesterday checks
    const isYesterday = msgLower.includes("yesterday") ||
                        msgLower.includes("kal") ||
                        msgLower.includes("कल") ||
                        msgLower.includes("last night") ||
                        msgLower.includes("kal raat") ||
                        msgLower.includes("कल रात") ||
                        msgLower.includes("yesterday morning");

    if (isYesterday) {
      const tempDate = new Date(Date.UTC(localYear, localMonth, localDay));
      tempDate.setUTCDate(tempDate.getUTCDate() - 1);
      targetYear = tempDate.getUTCFullYear();
      targetMonth = tempDate.getUTCMonth();
      targetDay = tempDate.getUTCDate();
      baseDateResolved = true;
    }
  }

  // 3. Clock time parsing
  const timeInput = (extractedRecordedAt || originalMessage || "").toLowerCase().trim();
  const colonMatch = timeInput.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i);
  const simpleMatch = timeInput.match(/\b(\d{1,2})\s*(am|pm)\b/i);

  let hasExplicitTime = false;
  let targetHours = localHours;
  let targetMinutes = localMinutes;

  if (colonMatch) {
    hasExplicitTime = true;
    let hr = parseInt(colonMatch[1], 10);
    const min = parseInt(colonMatch[2], 10);
    const ampm = colonMatch[3];
    if (ampm === "pm" && hr < 12) hr += 12;
    if (ampm === "am" && hr === 12) hr = 0;
    targetHours = hr;
    targetMinutes = min;
  } else if (simpleMatch) {
    hasExplicitTime = true;
    let hr = parseInt(simpleMatch[1], 10);
    const ampm = simpleMatch[2];
    if (ampm === "pm" && hr < 12) hr += 12;
    if (ampm === "am" && hr === 12) hr = 0;
    targetHours = hr;
    targetMinutes = 0;
  }

  // 4. Construct final date in patient's local timezone (represented as UTC hours)
  const finalLocalTimeMs = Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    targetHours,
    targetMinutes,
    hasExplicitTime ? 0 : localSeconds,
    hasExplicitTime ? 0 : localMilliseconds
  );

  // 5. Shift back to absolute UTC by subtracting the timezone offset
  const finalUtcTimeMs = finalLocalTimeMs - (tzOffsetMinutes * 60 * 1000);
  return new Date(finalUtcTimeMs);
}

/**
 * Deterministically checks if a numeric value is supported by the original user message text.
 * This blocks the AI from hallucinating or fabricating values that the user never typed.
 */
export function isValueSupportedByMessage(
  originalMessage: string,
  value: any,
  parameter: string
): boolean {
  if (value === undefined || value === null) return false;

  const cleanedMessage = stripNumbersBelongingToDatesAndTimes(originalMessage);

  // Extract all numbers from cleaned message (integers and decimals)
  const numbersInMessage = cleanedMessage.match(/-?\d+(\.\d+)?/g) || [];
  const floatNumbers = numbersInMessage.map(n => parseFloat(n));

  // If parameter is body_temperature and value is in C, we might have had Fahrenheit in the message
  if (parameter === "body_temperature") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      // Check if Celsius or Fahrenheit representation exists in message
      // Fahrenheit-to-Celsius conversion: C = (F - 32) * 5/9, so F = C * 1.8 + 32
      const expectedF = valNum * 1.8 + 32;

      const matchFound = floatNumbers.some(n => {
        // Direct match with tolerance (e.g. 37 vs 37)
        if (Math.abs(n - valNum) < 0.2) return true;
        // Fahrenheit match with tolerance (e.g. 98.6 vs 98.6)
        if (Math.abs(n - expectedF) < 1.0) return true;
        return false;
      });
      if (matchFound) return true;
    }
  }

  // If parameter is weight and value is in kg, we might have had lbs in the message
  if (parameter === "weight") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      const matchFound = floatNumbers.some(n => {
        // Direct match with tolerance (e.g. 72.4 vs 72.4)
        if (Math.abs(n - valNum) < 0.2) return true;
        // lbs match (lbs to kg conversion: kg = lbs * 0.45359237)
        const expectedKg = n * 0.45359237;
        if (Math.abs(expectedKg - valNum) < 1.0) return true;
        return false;
      });
      if (matchFound) return true;
    }
  }

  // If parameter is height, can we support feet/inches conversions?
  if (parameter === "height") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      // Direct match in cm first
      if (floatNumbers.some(n => Math.abs(n - valNum) < 0.2)) {
        return true;
      }
      // Check if feet and inches representation exists in message
      // E.g., if there are two numbers in the message like 5 and 8, they could represent feet and inches.
      for (let i = 0; i < floatNumbers.length; i++) {
        const ft = floatNumbers[i];
        if (ft >= 3 && ft <= 8) { // reasonable feet range
          // Check if there is an inch number
          for (let j = 0; j < floatNumbers.length; j++) {
            if (i === j) continue;
            const inch = floatNumbers[j];
            if (inch >= 0 && inch < 12) {
              const cm = (ft * 12 + inch) * 2.54;
              if (Math.abs(cm - valNum) < 3.0) return true;
            }
          }
          // Also check single feet measurement (e.g. "5 feet" -> 152.4 cm)
          const cmOnlyFt = ft * 12 * 2.54;
          if (Math.abs(cmOnlyFt - valNum) < 3.0) return true;
        }
      }
    }
  }

  // If parameter is blood_pressure, the value is e.g. "120/80"
  if (parameter === "blood_pressure") {
    const bpStr = String(value);
    const parts = bpStr.split("/");
    if (parts.length === 2) {
      const systolic = parseFloat(parts[0]);
      const diastolic = parseFloat(parts[1]);
      if (isNaN(systolic) || isNaN(diastolic)) return false;

      const sysMatch = floatNumbers.some(n => Math.abs(n - systolic) < 0.1);
      const diaMatch = floatNumbers.some(n => Math.abs(n - diastolic) < 0.1);
      if (sysMatch && diaMatch) return true;

      // Check if there is a decimal in floatNumbers that represents systolic.diastolic (e.g. 131.82)
      const decimalMatch = floatNumbers.some(n => {
        const str = String(n);
        const decimalParts = str.split(".");
        if (decimalParts.length === 2) {
          const decSys = parseFloat(decimalParts[0]);
          const decDiaStr = decimalParts[1];
          const decDia = parseFloat(decDiaStr);
          if (decSys === systolic) {
            if (decDia === diastolic) return true;
            // Also support trailing zero representation, e.g. "130.8" for "130/80" -> decDiaStr is "8", diastolic is 80
            if (decDiaStr.length === 1 && diastolic === decDia * 10) return true;
          }
        }
        return false;
      });
      if (decimalMatch) return true;
    }
    return false;
  }

  // General check: is the numeric value close to any number in the message?
  const numericVal = parseFloat(value);
  if (!isNaN(numericVal)) {
    return floatNumbers.some(n => Math.abs(n - numericVal) < 0.1);
  }

  return false;
}

/**
 * Deterministically validates a candidate record against safety guidelines,
 * ensuring no fabricated values, correct unit parameters, positive values, and full BP pairs.
 */
export function findUnresolvedPlausibleNumbers(
  originalMessage: string,
  candidateRecords: CandidateRecord[]
): number[] {
  let cleaned = stripNumbersBelongingToDatesAndTimes(originalMessage);

  // Also strip any words like OTP, ID, Order, PAT, etc. and their following numbers to prevent non-health numbers
  cleaned = cleaned.replace(/\b(?:otp|order|id|pat|msg|hosp|user|doctor|doc|visit|enc)\s*\d+/gi, "");
  // Also strip 4+ digit numbers (like 1256, 2026, etc. which are not home health measurements)
  cleaned = cleaned.replace(/\b\d{4,}\b/g, "");

  // Now find all numbers (including decimals)
  const numbersInMessage = cleaned.match(/-?\b\d+(?:\.\d+)?\b/g) || [];
  const floatNumbers = numbersInMessage.map(n => parseFloat(n));

  // Identify the numbers that are represented in candidateRecords
  const representedNumbers: number[] = [];
  for (const record of candidateRecords) {
    if (record.parameter === "blood_pressure") {
      if (record.systolic !== undefined) representedNumbers.push(record.systolic);
      if (record.diastolic !== undefined) representedNumbers.push(record.diastolic);
    } else if (record.value !== undefined && record.value !== null) {
      const val = Number(record.value);
      if (!isNaN(val)) {
        representedNumbers.push(val);
        if (record.parameter === "body_temperature") {
          representedNumbers.push(val * 1.8 + 32);
        }
        if (record.parameter === "weight") {
          representedNumbers.push(val / 0.45359237);
        }
      }
    }
  }

  const unresolved: number[] = [];
  for (const num of floatNumbers) {
    // Plausible measurements are usually between 30 and 500
    if (num < 30 || num > 500) {
      continue;
    }

    const isRepresented = representedNumbers.some(rn => Math.abs(rn - num) < 1.0);
    if (!isRepresented) {
      if (!unresolved.some(un => Math.abs(un - num) < 0.1)) {
        unresolved.push(num);
      }
    }
  }

  return unresolved;
}

export function validateCandidateRecord(
  record: CandidateRecord,
  originalMessage: string
): boolean {
  // 1. Parameter is supported
  const paramDef = PARAMETER_REGISTRY[record.parameter];
  if (!paramDef) {
    console.warn(`[Validation Error] Unsupported parameter: ${record.parameter}`);
    return false;
  }

  // 2. Unit handling is valid (must be empty or one of supported units)
  if (record.unit) {
    const cleanUnit = record.unit.trim();
    const isUnitSupported = paramDef.supportedUnits.some(
      u => u.toLowerCase() === cleanUnit.toLowerCase()
    );
    if (!isUnitSupported) {
      console.warn(`[Validation Error] Unsupported unit: ${record.unit} for parameter ${record.parameter}`);
      return false;
    }
  }

  // 3. Values exist and are supported/not fabricated
  if (record.parameter === "blood_pressure") {
    if (
      record.systolic === undefined || record.systolic === null || Number.isNaN(record.systolic) ||
      record.diastolic === undefined || record.diastolic === null || Number.isNaN(record.diastolic) ||
      String(record.systolic).trim() === "" || String(record.diastolic).trim() === "" ||
      String(record.systolic).toLowerCase() === "undefined" || String(record.diastolic).toLowerCase() === "undefined" ||
      String(record.systolic).toLowerCase() === "null" || String(record.diastolic).toLowerCase() === "null" ||
      String(record.systolic).toLowerCase() === "nan" || String(record.diastolic).toLowerCase() === "nan"
    ) {
      console.warn(`[Validation Error] Incomplete, invalid, or partial blood pressure values rejected.`);
      return false;
    }
    const sys = Number(record.systolic);
    const dia = Number(record.diastolic);
    if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) {
      console.warn(`[Validation Error] Blood pressure values must be positive numbers.`);
      return false;
    }
    // Check ranges
    if (sys < 70 || sys > 250 || dia < 40 || dia > 150) {
      console.warn(`[Validation Error] Implausible blood pressure range: ${sys}/${dia}`);
      return false;
    }
    // Check fabricated values
    const bpValStr = `${sys}/${dia}`;
    if (!isValueSupportedByMessage(originalMessage, bpValStr, record.parameter)) {
      console.warn(`[Validation Error] Fabricated blood pressure values rejected.`);
      return false;
    }
  } else {
    if (
      record.value === undefined || record.value === null ||
      String(record.value).trim() === "" ||
      String(record.value).toLowerCase() === "undefined" ||
      String(record.value).toLowerCase() === "null" ||
      String(record.value).toLowerCase() === "nan"
    ) {
      console.warn(`[Validation Error] Value is missing, invalid, or empty for parameter ${record.parameter}.`);
      return false;
    }
    const numVal = Number(record.value);
    if (isNaN(numVal) || numVal <= 0) {
      console.warn(`[Validation Error] Numeric value for ${record.parameter} must be a positive number.`);
      return false;
    }

    // Strict range validation for the remaining 7 parameters
    if (record.parameter === "blood_sugar") {
      const isMmol = record.unit === "mmol/L";
      const min = isMmol ? 1.6 : 30;
      const max = isMmol ? 27.8 : 500;
      if (numVal < min || numVal > max) {
        console.warn(`[Validation Error] Implausible blood glucose range: ${numVal} ${record.unit}`);
        return false;
      }
    } else if (record.parameter === "heart_rate") {
      if (numVal < 30 || numVal > 250) {
        console.warn(`[Validation Error] Implausible heart rate range: ${numVal}`);
        return false;
      }
    } else if (record.parameter === "oxygen_saturation") {
      if (numVal < 50 || numVal > 100) {
        console.warn(`[Validation Error] Implausible oxygen saturation range: ${numVal}`);
        return false;
      }
    } else if (record.parameter === "body_temperature") {
      if (numVal < 30 || numVal > 45) {
        console.warn(`[Validation Error] Implausible body temperature range: ${numVal}`);
        return false;
      }
    } else if (record.parameter === "weight") {
      if (numVal < 10 || numVal > 300) {
        console.warn(`[Validation Error] Implausible weight range: ${numVal}`);
        return false;
      }
    } else if (record.parameter === "respiratory_rate") {
      if (numVal < 10 || numVal > 40) {
        console.warn(`[Validation Error] Implausible respiratory rate range: ${numVal}`);
        return false;
      }
    } else if (record.parameter === "height") {
      if (numVal < 50 || numVal > 250) {
        console.warn(`[Validation Error] Implausible height range: ${numVal}`);
        return false;
      }
    }

    // Check fabricated value
    if (!isValueSupportedByMessage(originalMessage, record.value, record.parameter)) {
      console.warn(`[Validation Error] Fabricated value rejected for ${record.parameter}: ${record.value}`);
      return false;
    }
  }

  return true;
}

export function parseHealthRecord(
  aiResponse: string,
  patientId: string,
  source: "text" | "voice",
  originalMessage: string,
  whatsappMessageId: string,
  messageDate?: Date
): HealthRecord[] {
  try {
    const parsed = JSON.parse(aiResponse);

    // 1. Is it the new IntelligenceResult format?
    if (parsed && typeof parsed === "object" && "action" in parsed) {
      const result = parsed as IntelligenceResult;

      // If action is CLARIFY or IGNORE, we do NOT save health records
      if (result.action === "CLARIFY" || result.action === "IGNORE") {
        console.log(`[Parser] Action is ${result.action}, skipping HealthRecord creation.`);
        return [];
      }

      if (!Array.isArray(result.candidateRecords)) {
        return [];
      }

      const records: HealthRecord[] = [];
      for (const item of result.candidateRecords) {
        if (!item.parameter) continue;

        // Perform deterministic validation before adding
        if (!validateCandidateRecord(item, originalMessage)) {
          console.log(`[Parser] Deterministic validation failed for candidate record:`, item);
          continue;
        }

        const resolvedVal =
          item.parameter === "blood_pressure"
            ? `${item.systolic}/${item.diastolic}`
            : Number(item.value);

        records.push({
          patientId,
          parameter: item.parameter,
          value: resolvedVal,
          unit: item.unit ?? PARAMETER_REGISTRY[item.parameter]?.defaultUnit ?? "",
          context: item.context || undefined,
          timeContext: item.timeContext || undefined,
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt as string | null, messageDate),
          source,
          confidence: item.confidence ?? 0.99,
          originalMessage,
          whatsappMessageId: `${whatsappMessageId}_${item.parameter}`,
        });
      }
      return records;
    }

    // 2. Is it the legacy format (array of objects)?
    if (Array.isArray(parsed)) {
      const records: HealthRecord[] = [];

      for (const item of parsed) {
        if (!item.parameter) continue;

        // Create a temporary CandidateRecord to run through the validation engine
        const tempCandidate: CandidateRecord = {
          parameter: item.parameter,
          value: item.parameter === "blood_pressure" ? undefined : item.value,
          systolic: item.parameter === "blood_pressure" ? item.systolic : undefined,
          diastolic: item.parameter === "blood_pressure" ? item.diastolic : undefined,
          unit: item.unit ?? "",
          context: item.context,
          timeContext: item.timeContext,
          confidence: item.confidence ?? 0.99,
          recordedAt: item.recordedAt,
        };

        if (!validateCandidateRecord(tempCandidate, originalMessage)) {
          console.log(`[Parser] Legacy item failed deterministic validation:`, item);
          continue;
        }

        records.push({
          patientId,
          parameter: item.parameter,
          value:
            item.parameter === "blood_pressure"
              ? `${item.systolic}/${item.diastolic}`
              : Number(item.value),
          unit: item.unit ?? "",
          context: item.context || undefined,
          timeContext: item.timeContext || undefined,
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt, messageDate),
          source,
          confidence: 0.99,
          originalMessage,
          whatsappMessageId: `${whatsappMessageId}_${item.parameter}`,
        });
      }

      return records;
    }

    return [];
  } catch (error: any) {
    console.error("❌ [JSON Parse Error] Failed to parse AI response as JSON:", error?.message || error);
    console.error("📄 Raw response content that failed parsing was:", JSON.stringify(aiResponse));
    return [];
  }
}
