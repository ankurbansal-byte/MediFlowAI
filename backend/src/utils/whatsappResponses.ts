import { PARAMETER_REGISTRY } from "./parameterRegistry";

export type LanguageStyle = "english" | "hindi" | "hinglish";

export const FRIENDLY_NAMES: Record<string, { english: string; hindi: string; hinglish: string }> = {
  blood_sugar: { english: "sugar", hindi: "शुगर", hinglish: "sugar" },
  blood_pressure: { english: "BP", hindi: "बीपी", hinglish: "BP" },
  heart_rate: { english: "pulse", hindi: "पल्स", hinglish: "pulse" },
  oxygen_saturation: { english: "oxygen", hindi: "ऑक्सीजन", hinglish: "oxygen" },
  body_temperature: { english: "temperature", hindi: "तापमान", hinglish: "temperature" },
  weight: { english: "weight", hindi: "वजन", hinglish: "weight" },
  respiratory_rate: { english: "respiratory rate", hindi: "सांस की गति", hinglish: "respiratory rate" },
  height: { english: "height", hindi: "कद", hinglish: "height" },
};

export const CONTEXT_LABELS: Record<string, { english: string; hindi: string; hinglish: string }> = {
  fasting: { english: "Fasting", hindi: "फास्टिंग", hinglish: "Fasting" },
  pre_meal: { english: "Before meal", hindi: "खाने से पहले", hinglish: "Khane se pehle" },
  post_meal: { english: "After meal", hindi: "खाने के बाद", hinglish: "Khane ke baad" },
  random: { english: "Random", hindi: "रैंडम", hinglish: "Random" },
};

/**
 * Returns a localized friendly name for a health parameter.
 */
export function getFriendlyName(parameter: string, lang: LanguageStyle): string {
  const names = FRIENDLY_NAMES[parameter];
  if (!names) return parameter;
  return lang === "hindi" ? names.hindi : (lang === "hinglish" ? names.hinglish : names.english);
}

/**
 * Returns a localized label for a glucose context.
 */
export function getContextLabel(context: string, lang: LanguageStyle): string {
  const labels = CONTEXT_LABELS[context];
  if (!labels) return context;
  return lang === "hindi" ? labels.hindi : (lang === "hinglish" ? labels.hinglish : labels.english);
}

/**
 * Format a natural, language-matched single-record or multi-record confirmation message.
 * Must include standard parenthesized success markers like "(saved successfully.)" for Hinglish/Hindi
 * and "saved successfully." for English to support legacy tests.
 */
export function formatConfirmation(records: any[], lang: LanguageStyle): string {
  if (records.length === 0) {
    return lang === "hindi" ? "Done 👍" : "Done 👍";
  }

  const formattedItems = records.map(r => {
    const name = getFriendlyName(r.parameter, lang);
    const unit = r.unit || PARAMETER_REGISTRY[r.parameter]?.defaultUnit || "";

    let contextStr = "";
    if (r.parameter === "blood_sugar" && r.context && r.context !== "unknown") {
      const label = getContextLabel(r.context, lang);
      contextStr = ` (${label})`;
    }

    // Capitalize first letter of parameter name for English and Hinglish in confirmation
    const capName = (lang !== "hindi" && name.length > 0) ? name.charAt(0).toUpperCase() + name.slice(1) : name;
    const space = unit === "%" ? "" : " ";
    return `${capName} ${r.value}${space}${unit}${contextStr}`.trim();
  });

  if (lang === "hindi") {
    if (formattedItems.length === 1) {
      const suffix = records[0].parameter === "blood_sugar" ? "सेव हो गई।" : "सेव हो गया।";
      return `Done 👍 ${formattedItems[0]} ${suffix}`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} और ${last} सेव हो गए।`;
    }
  } else if (lang === "hinglish") {
    if (formattedItems.length === 1) {
      const suffix = records[0].parameter === "blood_sugar" ? "save ho gayi." : "save ho gaya.";
      return `Done 👍 ${formattedItems[0]} ${suffix}`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} aur ${last} save ho gaye.`;
    }
  } else {
    if (formattedItems.length === 1) {
      return `Done 👍 ${formattedItems[0]} saved successfully.`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} and ${last} saved successfully.`;
    }
  }
}

/**
 * Returns a localized message asking for glucose context clarification.
 */
export function getGlucoseContextClarification(lang: LanguageStyle, value?: any): string {
  const displayVal = value !== undefined && value !== null ? `${value}` : "";

  if (lang === "hindi") {
    const prefix = displayVal ? `शुगर ${displayVal} है 👍 ` : "";
    return `${prefix}यह शुगर रीडिंग खाली पेट, खाने से पहले, खाने के बाद या रैंडम थी?`;
  } else if (lang === "hinglish") {
    const prefix = displayVal ? `Sugar ${displayVal} hai 👍 ` : "";
    return `${prefix}Ye sugar reading fasting, khane se pehle, khane ke baad, ya random thi?`;
  } else {
    const prefix = displayVal ? `Got it — sugar is ${displayVal}. ` : "Got it — sugar is noted. ";
    return `${prefix}Was this glucose reading fasting, before a meal, after a meal, or random?`;
  }
}

/**
 * Returns a localized message asking for missing blood pressure diastolic number.
 */
export function getBloodPressureClarification(lang: LanguageStyle, systolicValue?: any): string {
  const displayVal = systolicValue !== undefined && systolicValue !== null ? `${systolicValue}` : "";

  if (lang === "hindi") {
    const prefix = displayVal ? `बीपी ${displayVal} ` : "बीपी ";
    return `${prefix}नोट कर लिया 👍 दूसरा (डायस्टोलिक) नंबर क्या है? कृपया रक्तचाप का दूसरा (डायस्टोलिक) नंबर भी बताएं, जैसे 140/90।`;
  } else if (lang === "hinglish") {
    const prefix = displayVal ? `BP ${displayVal} ` : "BP ";
    return `${prefix}note kar liya 👍 Doosra (diastolic) number kya hai? BP ka doosra (diastolic) number bhi batayein, jaise 140/90.`;
  } else {
    const prefix = displayVal ? `Got it — BP systolic is ${displayVal}. ` : "Got it — BP systolic is noted. ";
    return `${prefix}Please provide the second (diastolic) BP number, like 140/90.`;
  }
}

/**
 * Returns a localized message asking for body temperature unit clarification.
 */
export function getBodyTemperatureClarification(lang: LanguageStyle, value?: any): string {
  const displayVal = value !== undefined && value !== null ? `${value}` : "";

  if (lang === "hindi") {
    const prefix = displayVal ? `तापमान ${displayVal} ` : "तापमान ";
    return `${prefix}नोट कर लूँ 👍 बस बताइए — °C है या °F?`;
  } else if (lang === "hinglish") {
    const prefix = displayVal ? `Temperature ${displayVal} ` : "Temperature ";
    return `${prefix}note kar loon 👍 Bas bata dijiye — °C hai ya °F?`;
  } else {
    const prefix = displayVal ? `Got it — temperature is ${displayVal}. ` : "Got it — temperature is noted. ";
    return `${prefix}Was the temperature ${displayVal} °C or °F?`;
  }
}

/**
 * Returns a localized message for unresolved measurement clarification.
 */
export function getUnresolvedMeasurementsClarification(
  unresolved: number[],
  savedSummary: string,
  lang: LanguageStyle
): string {
  const numStr = unresolved.join(", ");
  if (lang === "hindi") {
    const prefix = savedSummary ? `${savedSummary} नोट कर लिया 👍 ` : "";
    return `${prefix}${numStr} किसकी रीडिंग है — शुगर, पल्स या कुछ और?`;
  } else if (lang === "hinglish") {
    const prefix = savedSummary ? `${savedSummary} note kar liya 👍 ` : "";
    return `${prefix}${numStr} kiski reading hai — sugar, pulse ya kuch aur?`;
  } else {
    const prefix = savedSummary ? `${savedSummary} saved 👍 ` : "";
    return `${prefix}What does ${numStr} represent — sugar, pulse, or something else?`;
  }
}

/**
 * Returns general clarification message when missing details.
 */
export function getMissingDetailsClarification(parameter: string, lang: LanguageStyle, value?: any): string {
  if (parameter === "blood_sugar") {
    return getGlucoseContextClarification(lang, value);
  }
  if (parameter === "blood_pressure") {
    return getBloodPressureClarification(lang, value);
  }
  if (parameter === "body_temperature") {
    return getBodyTemperatureClarification(lang, value);
  }
  return lang === "hindi"
    ? "कृपया स्पष्ट करें: कुछ विवरण गायब हैं।"
    : (lang === "hinglish" ? "Please clarify: details missing hain." : "Please clarify: missing details.");
}

/**
 * Localized cancellation acknowledgement.
 */
export function getCancellationAcknowledgement(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "❌ स्पष्टीकरण रद्द कर दिया गया है।";
  } else if (lang === "hinglish") {
    return "❌ Clarification cancel ho gaya hai.";
  } else {
    return "❌ Clarification cancelled.";
  }
}

/**
 * Localized safe generic failure response.
 */
export function getGenericFailureMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "❌ आपका हेल्थ रिकॉर्ड समझने में असमर्थ।";
  } else if (lang === "hinglish") {
    return "❌ Health record samajhne mein dikkat hui.";
  } else {
    return "❌ Unable to understand your health record.";
  }
}

/**
 * Localized conversational ignore response.
 */
export function getConversationalIgnoreMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "ℹ️ संदेश प्राप्त हुआ। बातचीत की प्रविष्टियों को स्वास्थ्य रिकॉर्ड के रूप में सहेज नहीं किया जाता है।";
  } else if (lang === "hinglish") {
    return "ℹ️ Message mil gaya. Baatchit ko health record mein save nahi kiya jata.";
  } else {
    return "ℹ️ Message received. Conversational updates are not recorded as health entries.";
  }
}
