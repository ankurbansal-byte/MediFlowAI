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
 * Localized voice note could not be understood/transcribed response.
 */
export function getVoiceNotUnderstoodMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "वॉइस नोट समझ में नहीं आया। कृपया दोबारा स्पष्ट वॉइस नोट भेजें या रीडिंग टाइप कर दें।";
  } else if (lang === "hinglish") {
    return "Voice note samajh nahi aaya. Kripya dobara clear voice note bhejein ya reading type kar dein.";
  } else {
    return "Sorry, I couldn't understand the voice note. Please send a clearer voice note or type your reading.";
  }
}

/**
 * Localized unsupported audio format response.
 */
export function getUnsupportedAudioMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "यह ऑडियो फ़ॉर्मेट समर्थित नहीं है। कृपया मानक व्हाट्सएप वॉइस नोट भेजें।";
  } else if (lang === "hinglish") {
    return "Yeh audio format supported nahi hai. Kripya standard WhatsApp voice note bhejein.";
  } else {
    return "Unsupported audio format. Please send a standard WhatsApp voice note.";
  }
}

/**
 * Localized audio too large/long response.
 */
export function getAudioTooLargeMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "वॉइस नोट बहुत बड़ा या लंबा है। कृपया 5MB से छोटा वॉइस नोट भेजें।";
  } else if (lang === "hinglish") {
    return "Voice note bahut bada ya lamba hai. Kripya 5MB se chhota voice note bhejein.";
  } else {
    return "The voice note is too large or too long. Please send a shorter voice note under 5MB.";
  }
}

/**
 * Localized temporary transcription failure response.
 */
export function getTranscriptionFailureMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "ट्रांसक्रिप्शन सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में प्रयास करें या रीडिंग टाइप कर दें।";
  } else if (lang === "hinglish") {
    return "Transcription service abhi available nahi hai. Kripya thodi der baad try karein ya reading type kar dein.";
  } else {
    return "Transcription service is temporarily unavailable. Please try again later or type your reading.";
  }
}

/**
 * Localized empty voice note/transcript response.
 */
export function getEmptyVoiceTranscriptMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "वॉइस नोट खाली या मौन लग रहा है। कृपया स्पष्ट आवाज़ में दोबारा भेजें।";
  } else if (lang === "hinglish") {
    return "Voice note khali ya silent lag raha hai. Kripya clear aawaz mein dobara bhejein.";
  } else {
    return "The voice note seems to be empty or silent. Please speak clearly.";
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

/**
 * Format a natural, language-matched correction confirmation message.
 */
export function formatCorrectionConfirmation(
  parameter: string,
  oldValue: string | number,
  newValue: string | number,
  unit: string,
  lang: LanguageStyle,
  timeContext?: string,
  context?: string
): string {
  const name = getFriendlyName(parameter, lang);
  const capName = (lang !== "hindi" && name.length > 0) ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  const tcStr = timeContext ? (lang === "hindi" ? `${timeContext === "morning" ? "सुबह" : timeContext === "evening" ? "शाम" : timeContext} ` : `${timeContext} `) : "";
  const ctxStr = context && context !== "unknown" ? ` (${getContextLabel(context, lang)})` : "";

  if (lang === "hindi") {
    const isSugar = parameter === "blood_sugar";
    const actionWord = isSugar ? "सही कर दी गई।" : "सही कर दिया गया।";
    return `हो गया 👍 ${tcStr}${capName} ${oldValue} से ${newValue} ${unit}${ctxStr} ${actionWord}`.replace(/\s+/g, " ").trim();
  } else if (lang === "hinglish") {
    const isSugar = parameter === "blood_sugar";
    const actionWord = isSugar ? "correct ho gayi." : "correct ho gaya.";
    return `Done 👍 ${tcStr}${capName} ${oldValue} se ${newValue} ${unit}${ctxStr} ${actionWord}`.replace(/\s+/g, " ").trim();
  } else {
    return `Done 👍 ${tcStr}${capName} corrected from ${oldValue} to ${newValue} ${unit}${ctxStr}.`.replace(/\s+/g, " ").trim();
  }
}

/**
 * Returns a localized message asking which ambiguous record they want corrected.
 */
export function getAmbiguousCorrectionClarification(
  parameter: string,
  oldValue: string | number,
  targets: any[],
  lang: LanguageStyle
): string {
  const name = getFriendlyName(parameter, lang);
  const options = targets.map((t, idx) => {
    const tc = t.timeContext || "";
    const ctx = t.context && t.context !== "unknown" ? t.context : "";
    const info = [tc, ctx].filter(Boolean).join(" ");
    return info || `Option ${idx + 1}`;
  });

  const optionList = options.join(lang === "hindi" ? " या " : (lang === "hinglish" ? " ya " : " or "));

  if (lang === "hindi") {
    return `आप कौन सी ${name} ${oldValue} रीडिंग सही करना चाहते हैं — ${optionList}?`;
  } else if (lang === "hinglish") {
    return `Aap kaun si ${name} ${oldValue} reading correct karna chahte hain — ${optionList}?`;
  } else {
    return `Which ${name} reading of ${oldValue} do you want to correct — ${optionList}?`;
  }
}

/**
 * Returns a localized message indicating that no matching target record could be found.
 */
export function getCorrectionTargetNotFoundMessage(
  parameter: string,
  oldValue: string | number | null,
  lang: LanguageStyle
): string {
  const name = parameter ? getFriendlyName(parameter, lang) : (lang === "hindi" ? "रीडिंग" : (lang === "hinglish" ? "reading" : "reading"));
  const oldValStr = oldValue ? ` ${oldValue}` : "";

  if (lang === "hindi") {
    return `क्षमा करें, मुझे पहले की कोई ${name}${oldValStr} नहीं मिली। कृपया सही जानकारी के साथ फिर से प्रयास करें।`;
  } else if (lang === "hinglish") {
    return `Sorry, mujhe pehle ki koi ${name}${oldValStr} nahi mili. Kripya sahi information ke sath fir se try karein.`;
  } else {
    return `Sorry, I couldn't find any prior ${name} reading with value${oldValStr}. Please try again with the correct info.`;
  }
}

/**
 * Centralized, natural, language-matched urgent/emergency response warning.
 * Never diagnoses condition, calculates probability, or claims heart attack/stroke.
 */
export function getEmergencyResponse(lang: LanguageStyle, savedSummary?: string): string {
  if (lang === "hindi") {
    const prefix = savedSummary ? `(आपकी ${savedSummary} सेव कर ली गई है।) ` : "";
    return `${prefix}⚠️ आपातकालीन स्थिति: कृपया तुरंत नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं या स्थानीय आपातकालीन सेवाओं से संपर्क करें। तत्काल सहायता के लिए व्हाट्सएप पर निर्भर न रहें।`;
  } else if (lang === "hinglish") {
    const prefix = savedSummary ? `(Aapki ${savedSummary} record ho gayi hai.) ` : "";
    return `${prefix}⚠️ EMERGENCY: Kripya turant nazdeeki hospital ke emergency ward mein jayein ya local emergency services ko call karein. Urgent help ke liye WhatsApp par depend na rahein.`;
  } else {
    const prefix = savedSummary ? `(Your ${savedSummary} has been recorded.) ` : "";
    return `${prefix}⚠️ EMERGENCY: Please seek immediate medical help at the nearest emergency room or hospital, or call local emergency services. Do not rely on WhatsApp for urgent care.`;
  }
}

/**
 * Centralized, natural, language-matched clarification message for implausible/dangerous-looking measurements.
 */
export function getImplausibleValueClarification(parameter: string, value: any, lang: LanguageStyle): string {
  const name = getFriendlyName(parameter, lang);
  if (lang === "hindi") {
    return `${name} की रीडिंग (${value}) कुछ असामान्य लग रही है। कृपया दोबारा जांचें और सही रीडिंग दर्ज करें।`;
  } else if (lang === "hinglish") {
    return `${name} ki reading (${value}) kuch unusual lag rahi hai. Kripya fir se check karke sahi reading enter karein.`;
  } else {
    return `The reading for ${name} (${value}) seems unusual. Please re-check and enter the correct reading.`;
  }
}

/**
 * Format latest reading response for read-back query.
 */
export function formatLatestReading(
  parameter: string,
  value: any,
  unit: string,
  context: string | undefined,
  lang: LanguageStyle,
  timeContext?: string
): string {
  const name = getFriendlyName(parameter, lang);
  const contextLabel = context && context !== "unknown" ? getContextLabel(context, lang) : "";
  const space = unit === "%" ? "" : " ";

  let tcLabel = "";
  if (timeContext) {
    if (lang === "hindi") {
      tcLabel = timeContext === "morning" ? "सुबह" : timeContext === "afternoon" ? "दोपहर" : timeContext === "evening" ? "शाम" : "रात";
    } else if (lang === "hinglish") {
      tcLabel = timeContext === "morning" ? "Morning" : timeContext === "afternoon" ? "Dopahar" : timeContext === "evening" ? "Shaam" : "Raat";
    } else {
      tcLabel = timeContext.charAt(0).toUpperCase() + timeContext.slice(1);
    }
  }

  let details: string[] = [];
  if (contextLabel) details.push(contextLabel);
  if (tcLabel) details.push(tcLabel);

  const contextStr = details.length > 0 ? ` (${details.join(" - ")})` : "";

  if (lang === "hindi") {
    return `आपकी नवीनतम ${name} रीडिंग ${value}${space}${unit}${contextStr} है।`;
  } else if (lang === "hinglish") {
    return `Aapki latest ${name} reading ${value}${space}${unit}${contextStr} hai.`;
  } else {
    return `Your latest ${name} reading is ${value}${space}${unit}${contextStr}.`;
  }
}

/**
 * Format compact list of today's readings.
 */
export function formatTodaysReadings(records: any[], lang: LanguageStyle): string {
  let title = "Today's readings:";
  if (lang === "hindi") {
    title = "आज की रीडिंग:";
  } else if (lang === "hinglish") {
    title = "Aaj ki readings:";
  }

  const lines = records.map(r => {
    const name = getFriendlyName(r.parameter, lang);
    const capName = (lang !== "hindi" && name.length > 0) ? name.charAt(0).toUpperCase() + name.slice(1) : name;
    const unit = r.unit || PARAMETER_REGISTRY[r.parameter]?.defaultUnit || "";
    const space = unit === "%" ? "" : " ";

    const contextLabel = r.context && r.context !== "unknown" ? getContextLabel(r.context, lang) : "";

    let tcLabel = "";
    if (r.timeContext) {
      if (lang === "hindi") {
        tcLabel = r.timeContext === "morning" ? "सुबह" : r.timeContext === "afternoon" ? "दोपहर" : r.timeContext === "evening" ? "शाम" : "रात";
      } else if (lang === "hinglish") {
        tcLabel = r.timeContext === "morning" ? "Morning" : r.timeContext === "afternoon" ? "Dopahar" : r.timeContext === "evening" ? "Shaam" : "Raat";
      } else {
        tcLabel = r.timeContext.charAt(0).toUpperCase() + r.timeContext.slice(1);
      }
    }

    let details: string[] = [];
    if (contextLabel) details.push(contextLabel);
    if (tcLabel) details.push(tcLabel);

    const detailStr = details.length > 0 ? ` (${details.join(" - ")})` : "";

    return `• ${capName} ${r.value}${space}${unit}${detailStr}`;
  });

  return `${title}\n${lines.join("\n")}`;
}

/**
 * Format response when no records are found.
 */
export function formatNoRecords(lang: LanguageStyle, parameter?: string): string {
  if (parameter) {
    const name = getFriendlyName(parameter, lang);
    if (lang === "hindi") {
      return `${name} की कोई रीडिंग नहीं मिली।`;
    } else if (lang === "hinglish") {
      return `${name} ki koi reading nahi mili.`;
    } else {
      return `No reading found for ${name}.`;
    }
  } else {
    if (lang === "hindi") {
      return "आज की कोई रीडिंग नहीं मिली।";
    } else if (lang === "hinglish") {
      return "Aaj ki koi reading nahi mili.";
    } else {
      return "No readings found for today.";
    }
  }
}
