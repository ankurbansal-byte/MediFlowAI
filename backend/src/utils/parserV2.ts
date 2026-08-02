import { PARAMETER_REGISTRY } from "./parameterRegistry";
import { GlucoseContext, CandidateRecord } from "./intelligenceContract";

export type LanguageStyle = "english" | "hindi" | "hinglish";

// ==========================================
// 1. Universal Synonym Engine (Config-driven)
// ==========================================

export const PARAMETER_SYNONYMS: Record<string, string[]> = {
  blood_sugar: ["sugar level", "sugar", "glucose", "shugar", "cheeni", "schugar", "शुगर", "सीनी", "चीनी", "meri sugar", "mera sugar"],
  blood_pressure: ["blood pressure", "pressure", "bp", "बीपी", "रक्तचाप", "mera bp", "meri bp", "ब्लड प्रेशर"],
  heart_rate: ["heart rate", "pulse", "hr", "bpm", "dhadkan", "dil", "beat", "पल्स", "धड़कन", "नाड़ी"],
  oxygen_saturation: ["oxygen saturation", "oxygen level", "oxygen", "spo2", "o2", "saturation", "oxigen", "ऑक्सीजन", "ओक्सीजन", "ऑक्सिजन"],
  body_temperature: ["body temp", "temp", "temperature", "fever", "bukhar", "bukhaar", "tapman", "तापमान", "बुखार", "बुख़ार"],
  weight: ["weight", "vajan", "wajan", "kg", "vazan", "वजन", "वज़न"],
  respiratory_rate: ["breathing rate", "breathing", "breath", "resp", "respiratory", "rr", "saans", "सांस की दर"],
  height: ["height", "lambai", "kad", "हाइट", "लंबाई", "कद"]
};

export const GLUCOSE_CONTEXT_SYNONYMS: Record<GlucoseContext, string[]> = {
  fasting: [
    "fasting", "fasted", "empty stomach", "empty-stomach", "khali pet", "khaali pet", "fast", "fating", "fastg", "bina khaye", "बिना खाए", "बिना कुछ खाए", "खाली पेट", "सुबह खाली पेट"
  ],
  pre_meal: [
    "before a meal", "before meal", "pre-meal", "pre meal", "premeal", "pre_meal",
    "before breakfast", "before breakfast reading", "before eating", "before food", "preprandial",
    "before lunch", "before dinner", "khane se pehle", "खाने से पहले", "nashte se pehle", "lunch se pehle", "लंच से पहले", "dinner se pehle", "डिनर से पहले", "breakfast se pehle", "bhojan se pehle", "नाश्ते से पहले", "भोजन से पहले"
  ],
  post_meal: [
    "after meal", "after a meal", "after food", "after eating", "after lunch", "after dinner", "after breakfast", "post meal", "post-meal", "postprandial", "postmeal", "post_meal",
    "khane ke baad", "khana khane ke baad", "khane ke 2 ghante baad", "2 hours after meal", "2 hrs after food", "nashte ke baad", "नाश्ते के बाद", "lunch ke baad", "लंच के बाद", "dinner ke baad", "डिनर के बाद", "breakfast ke baad", "meal ke baad", "bhojan ke baad", "खाने के बाद", "भोजन के बाद"
  ],
  random: [
    "random", "casual", "anytime", "random reading", "रैंडम", "कभी भी", "random tha", "any time"
  ],
  unknown: []
};

export const BOOLEAN_SYNONYMS: Record<"yes" | "no", string[]> = {
  yes: ["yes", "y", "yeah", "yes save", "save", "save again", "haan", "ha", "hnn", "correct", "हाँ", "हा", "हाँ सेव करो", "करो", "सेव करो", "confirm", "हां"],
  no: ["no", "n", "nope", "cancel", "ignore", "na", "nahi", "nahin", "नहीं", "ना", "rehne do", "rehne-do", "rehnedo", "chhodo", "chhod do", "छोड़ दो", "रहने दो"]
};

export const GREETING_SYNONYMS = [
  "thank you", "thanks", "shukriya", "dhanyawad", "dhanyavaad",
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "namaste", "namaskar", "pranam", "bye", "goodbye"
];

export const RETRIEVAL_SYNONYMS = [
  "आज की रिपोर्ट",
  "आज क्या सेव किया",
  "मेरी आज की रिपोर्ट",
  "आज का रिकॉर्ड",
  "मेरी रिपोर्ट दिखाओ",
  "today's report",
  "today's readings",
  "what did i record today",
  "show today's records"
];

// Helper to normalize strings
export function cleanText(text: string): string {
  return text.toLowerCase().trim();
}

export function matchSynonym(text: string, synonyms: string[]): boolean {
  const clean = cleanText(text);
  for (const syn of synonyms) {
    if (/[\u0900-\u097F]/.test(syn)) {
      if (clean.includes(syn)) return true;
    } else {
      const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(clean)) return true;
    }
  }
  return false;
}

// ==========================================
// 2. Retrieval Engine
// ==========================================

export function isRetrievalQuery(text: string): boolean {
  const clean = cleanText(text);
  if (RETRIEVAL_SYNONYMS.some(phrase => clean.includes(phrase))) {
    return true;
  }
  const queryKeywords = [
    "kitni", "kitna", "kya", "bheji", "bheja", "what", "did", "how", "?", "show", "tell", "read-back", "read back",
    "batao", "bataiye", "bata", "dikhao", "dikha", "readings", "reading", "रिपोर्ट", "रिकॉर्ड"
  ];
  const hasQueryKeyword = queryKeywords.some(kw => {
    if (kw === "?") return clean.includes("?");
    return new RegExp(`\\b${kw}\\b`, "i").test(clean);
  });
  return hasQueryKeyword && (
    clean.includes("today") || clean.includes("aaj") ||
    clean.includes("last") || clean.includes("latest") ||
    clean.includes("bheji") || clean.includes("bheja") ||
    clean.includes("kitni thi") || clean.includes("kya tha") ||
    clean.includes("kya hai") || clean.includes("reading") ||
    clean.includes("readings")
  );
}

// ==========================================
// 3. Validation Engine
// ==========================================

export function validateValue(param: string, val: number, unit?: string): boolean {
  if (isNaN(val) || val <= 0) return false;

  const def = PARAMETER_REGISTRY[param];
  if (!def) return true;

  const ranges = def.plausibleRanges;
  if (!ranges) return true;

  // Handle compound components specifically if passed (like systolic/diastolic)
  if (def.isCompound && unit && ranges[unit]) {
    const range = ranges[unit];
    return val >= range.min && val <= range.max;
  }

  const u = unit || def.defaultUnit;
  const range = ranges[u] || ranges["default"];
  if (range) {
    return val >= range.min && val <= range.max;
  }
  return true;
}

// ==========================================
// 4. Intent Engine
// ==========================================

export type ParserIntent =
  | "health_measurement"
  | "retrieval"
  | "conversational"
  | "emergency"
  | "correction"
  | "duplicate_confirmation"
  | "help"
  | "unknown";

export function detectMessageIntent(
  text: string,
  state?: { isDuplicatePending?: boolean; isClarificationPending?: boolean }
): ParserIntent {
  const clean = cleanText(text);

  // 1. Emergency Detection
  // Import from healthRecordParser or run inline to be self-contained
  // Let's call the helper to keep it perfectly aligned
  // Wait, we can run inline checking as it's cleaner:
  const isEmergency = detectEmergencyUrgency(text);
  if (isEmergency) return "emergency";

  // 2. Duplicate Confirmation turn
  if (state?.isDuplicatePending) {
    if (matchSynonym(clean, BOOLEAN_SYNONYMS.yes) || matchSynonym(clean, BOOLEAN_SYNONYMS.no)) {
      return "duplicate_confirmation";
    }
  }

  // 3. Correction
  if (isCorrectionMessage(text)) return "correction";

  // 4. Retrieval
  if (isRetrievalQuery(text)) return "retrieval";

  // 5. Help
  const helpKeywords = ["help", "help me", "support", "madad", "मदद", "सहायता", "sahayata"];
  if (helpKeywords.some(kw => clean.includes(kw))) return "help";

  // 6. Conversational / greeting check
  const isGreeting = GREETING_SYNONYMS.some(g => clean === g || clean.startsWith(g + " ") || clean.endsWith(" " + g));
  if (isGreeting && !hasVitalsKeywordsAndNumbers(text)) {
    return "conversational";
  }

  // 7. Health Measurement check
  if (hasVitalsKeywordsAndNumbers(text)) {
    return "health_measurement";
  }

  return "unknown";
}

function hasVitalsKeywordsAndNumbers(text: string): boolean {
  const clean = cleanText(text);
  const hasNumbers = /\b\d+\b/.test(stripNumbersBelongingToDatesAndTimes(text));
  if (!hasNumbers) return false;

  for (const [param, keywords] of Object.entries(PARAMETER_SYNONYMS)) {
    for (const kw of keywords) {
      if (/[\u0900-\u097F]/.test(kw)) {
        if (clean.includes(kw)) return true;
      } else {
        const rx = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
        if (rx.test(clean)) return true;
      }
    }
  }
  return false;
}

// Transplant emergency detection
export function detectEmergencyUrgency(message: string): "emergency" | null {
  const clean = message.toLowerCase().trim();
  const negationPhrases = [
    "no chest pain", "no breathing", "not having", "past", "historical", "kal tha", "kal thi", "kal thaa",
    "doctor ko dikha", "doctor ko dikhaya", "doctor ko bol", "now fine", "now better", "now ok", "theek hai",
    "thik hai", "theek hoon", "thik hoon", "breathing rate", "respiratory rate"
  ];
  if (negationPhrases.some(phrase => clean.includes(phrase))) {
    return null;
  }
  const isChestPain =
    clean.includes("chest pain") ||
    ((clean.includes("seene") || clean.includes("chhati") || clean.includes("dil") || clean.includes("chati") || clean.includes("सीने") || clean.includes("छाती") || clean.includes("दिल")) &&
     (clean.includes("pain") || clean.includes("dard") || clean.includes("दर्द")));
  const isBreathingDifficulty =
    clean.includes("difficulty breathing") || clean.includes("can't breathe") || clean.includes("cannot breathe") ||
    (clean.includes("saans") && (clean.includes("takleef") || clean.includes("dikkat") || clean.includes("pareshani") || clean.includes("phool") || clean.includes("nahi") || clean.includes("nahin") || clean.includes("nhi"))) ||
    (clean.includes("सांस") && (clean.includes("तकलीफ") || clean.includes("दिक्कत") || clean.includes("परेशानी") || clean.includes("कठिनाई") || clean.includes("फूल") || clean.includes("नहीं") || clean.includes("नही")));
  const isUnconscious =
    clean.includes("unconscious") || clean.includes("behoshi") || clean.includes("behosh") || clean.includes("बेहोश") || clean.includes("बेहोशी");
  const isBleeding =
    clean.includes("severe bleeding") || clean.includes("heavy bleeding") || clean.includes("khoon beh raha") ||
    clean.includes("खून बह रहा") || clean.includes("भारी ब्लीडिंग") || clean.includes("बहुत खून") ||
    (clean.includes("khoon") && clean.includes("bahut"));
  const isStrokeOrSpeech =
    clean.includes("stroke") || clean.includes("speech difficulty") || clean.includes("difficulty speaking") ||
    (clean.includes("sudden") && clean.includes("weakness")) || (clean.includes("achanak") && clean.includes("kamzori")) ||
    (clean.includes("bolne") && (clean.includes("takleef") || clean.includes("dikkat") || clean.includes("difficulty"))) ||
    (clean.includes("बोलने") && (clean.includes("तकलीफ") || clean.includes("दिक्कत") || clean.includes("कठिनाई") || clean.includes("परेशानी")));

  if (isChestPain || isBreathingDifficulty || isUnconscious || isBleeding || isStrokeOrSpeech) {
    return "emergency";
  }
  return null;
}

export function isCorrectionMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim();
  const keywords = [
    "nahi", "nahin", "galat", "wrong", "mistake", "sorry", "instead of", "correct",
    "नहीं", "गलत", "सुधार", "बदले", "correction", "edit", "change", "kar do", "ki jagah", "की जगह", "actual", "actually"
  ];
  const hasKeyword = keywords.some(kw => clean.includes(kw));
  const hasNumbers = /\b\d+\b/.test(clean);
  const comparisonPattern = /\b\d+\s*(?:nahi|nahin|instead\s*of|not|galat|नहीं|ki\s*jagah|की\s*जगह)\s*\d+\b/i.test(clean);
  const hasParam = detectParameterFromMessage(msg) !== null;
  const hasGlucoseCtx = parseGlucoseContextV2(msg) !== null;

  return hasKeyword && (hasNumbers || comparisonPattern || hasParam || hasGlucoseCtx);
}

export function detectParameterFromMessage(msg: string): string | null {
  const clean = msg.toLowerCase().trim();
  for (const [param, keywords] of Object.entries(PARAMETER_SYNONYMS)) {
    for (const kw of keywords) {
      if (/[^\u0000-\u007F]/.test(kw)) {
        if (clean.includes(kw)) return param;
      } else {
        const rx = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
        if (rx.test(clean)) return param;
      }
    }
  }
  return null;
}

export function parseGlucoseContextV2(msg: string): GlucoseContext | null {
  const clean = msg.toLowerCase().trim();
  for (const [context, keywords] of Object.entries(GLUCOSE_CONTEXT_SYNONYMS)) {
    for (const kw of keywords) {
      if (/[^\u0000-\u007F]/.test(kw)) {
        if (clean.includes(kw)) return context as GlucoseContext;
      } else {
        const rx = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
        if (rx.test(clean)) return context as GlucoseContext;
      }
    }
  }
  return null;
}

export function stripNumbersBelongingToDatesAndTimes(msg: string): string {
  let cleaned = msg.toLowerCase();
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");
  const monthsPattern = "(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)";
  const ddMonthYyyyRegex = new RegExp(`\\b\\d{1,2}\\s+${monthsPattern}\\s*(?:\\d{2,4})?\\b`, "gi");
  cleaned = cleaned.replace(ddMonthYyyyRegex, "");
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");
  cleaned = cleaned.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (match, p1, p2) => {
    const d = parseInt(p1, 10);
    const m = parseInt(p2, 10);
    if (d <= 31 && m <= 12) return "";
    return match;
  });
  cleaned = cleaned.replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/gi, "");
  cleaned = cleaned.replace(/\b\d+\s*(?:am|pm|hours|hrs|hr|minutes|mins|min|seconds|sec)\b/gi, "");
  return cleaned;
}
