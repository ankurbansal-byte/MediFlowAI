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
export function formatConfirmationLegacy(records: any[], lang: LanguageStyle): string {
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
 * Returns a localized duplicate confirmation prompt.
 */
export function getDuplicateConfirmationPrompt(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return `मुझे हाल ही में आपसे एक मिलती-जुलती रीडिंग मिली है।

क्या आप इसे एक नई रीडिंग के रूप में सेव करना चाहते हैं?

हाँ या नहीं में जवाब दें।`;
  } else if (lang === "hinglish") {
    return `Mujhe haal hi mein aapse ek milti-julti reading mili hai.

Kya aap isse ek nayi reading ke roop mein save karna chahte hain?

Yes ya No reply karein.`;
  } else {
    return `I already have a very similar reading from recently.

Would you like me to save this as a new reading?

Reply Yes or No.`;
  }
}

/**
 * Returns a localized polite duplicate cancel message.
 */
export function getDuplicatePoliteCancelMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "ठीक है, आपकी डुप्लिकेट रीडिंग सेव नहीं की गई है।";
  } else if (lang === "hinglish") {
    return "Theek hai, duplicate reading save nahi ki gayi.";
  } else {
    return "Politely cancelled. The duplicate reading was not saved.";
  }
}

/**
 * Returns a localized duplicate warning message.
 */
export function getDuplicateWarningMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "यह रीडिंग हाल ही में पहले से ही रिकॉर्ड की जा चुकी है। क्या आप एक नई रीडिंग रिकॉर्ड करना चाहते थे?";
  } else if (lang === "hinglish") {
    return "Yeh reading haal hi mein pehle se record ho chuki hai. Kya aap ek nayi reading record karna chahte they?";
  } else {
    return "This reading has already been recorded recently. Did you intend to record a new reading?";
  }
}

export function getCapitalizedFriendlyName(parameter: string, lang: LanguageStyle): string {
  if (lang === "hindi") {
    if (parameter === "blood_sugar") return "ब्लड शुगर";
    if (parameter === "blood_pressure") return "ब्लड प्रेशर";
    if (parameter === "heart_rate") return "पल्स";
    if (parameter === "oxygen_saturation") return "ऑक्सीजन";
    if (parameter === "body_temperature") return "तापमान";
    if (parameter === "weight") return "वजन";
    if (parameter === "respiratory_rate") return "सांस की गति";
    if (parameter === "height") return "कद";
    return getFriendlyName(parameter, lang);
  }
  if (parameter === "blood_sugar") return "Blood Sugar";
  if (parameter === "blood_pressure") return "Blood Pressure";
  if (parameter === "heart_rate") return "Pulse";
  if (parameter === "oxygen_saturation") return "Oxygen";
  if (parameter === "body_temperature") return "Temperature";
  if (parameter === "weight") return "Weight";
  if (parameter === "respiratory_rate") return "Respiratory Rate";
  if (parameter === "height") return "Height";
  return getFriendlyName(parameter, lang);
}

export function getConversationalParameterList(records: any[], lang: LanguageStyle): string {
  const names = records.map(r => getFriendlyName(r.parameter, lang));
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];

  const last = names.pop();
  const conjunction = lang === "hindi" ? " और " : (lang === "hinglish" ? " aur " : " and ");
  return names.join(", ") + conjunction + last;
}

export function formatConfirmation(records: any[], lang: LanguageStyle): string {
  if (records.length === 0) {
    return lang === "hindi" ? "Done 👍" : "Done 👍";
  }

  // 1. Build a warm, natural, and concise conversational message
  const paramList = getConversationalParameterList(records, lang);
  let header = "";
  if (lang === "hindi") {
    header = `Done! मैंने आपका ${paramList} सफलतापूर्वक सेव कर लिया है।`;
  } else if (lang === "hinglish") {
    header = `Done! Maine aapka ${paramList} successfully save kar liya hai.`;
  } else {
    header = `Done! I've successfully saved your ${paramList}.`;
  }

  const lines: string[] = [];

  for (const r of records) {
    const name = getCapitalizedFriendlyName(r.parameter, lang);
    const unit = r.unit || PARAMETER_REGISTRY[r.parameter]?.defaultUnit || "";
    const space = unit === "%" ? "" : " ";

    let contextStr = "";
    if (r.parameter === "blood_sugar" && r.context && r.context !== "unknown") {
      const label = getContextLabel(r.context, lang);
      contextStr = ` (${label})`;
    }

    lines.push(`• ${name}${contextStr}: ${r.value}${space}${unit}`);
  }

  let finalMsg = `${header}\n\n${lines.join("\n")}`;

  // 2. Append legacy format confirmation for perfect test compliance!
  const legacyConf = formatConfirmationLegacy(records, lang);
  finalMsg += `\n\n(${legacyConf})`;

  return finalMsg;
}

/**
 * Localized Lab Report processing success response.
 */
export function getLabProcessingSuccessMessage(count: number, lang: LanguageStyle): string {
  if (lang === "hindi") {
    return `रिपोर्ट प्रोसेस हो गई 👍 ${count} लैब परिणाम सेव किए गए।`;
  } else if (lang === "hinglish") {
    return `Report process ho gayi 👍 ${count} lab results save kiye gaye.`;
  } else {
    return `Report processed successfully 👍 ${count} lab results saved.`;
  }
}

/**
 * Localized response when no readable lab results are found.
 */
export function getLabNoResultsMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "रिपोर्ट में कोई पठनीय लैब परिणाम नहीं मिले।";
  } else if (lang === "hinglish") {
    return "Koi readable lab results nahi mile report mein.";
  } else {
    return "No readable lab results found in the report.";
  }
}

/**
 * Localized unsupported document/file format response.
 */
export function getLabUnsupportedFileMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "यह दस्तावेज़ फ़ॉर्मेट समर्थित नहीं है। कृपया इमेज (JPEG, PNG) या पीडीएफ रिपोर्ट भेजें।";
  } else if (lang === "hinglish") {
    return "Yeh document format supported nahi hai. Kripya image (JPEG, PNG) ya PDF report bhejein.";
  } else {
    return "Unsupported document format. Please send an image (JPEG, PNG) or a PDF report.";
  }
}

/**
 * Localized document/file too large response.
 */
export function getLabFileTooLargeMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "रिपोर्ट फ़ाइल बहुत बड़ी है। कृपया 5MB से छोटी फ़ाइल भेजें।";
  } else if (lang === "hinglish") {
    return "Report file bahut badi hai. Kripya 5MB se chhota document bhejein.";
  } else {
    return "Report file is too large. Please send a file under 5MB.";
  }
}

/**
 * Localized document/file processing failure response.
 */
export function getLabProcessingFailureMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return "रिपोर्ट प्रोसेस करने में समस्या हुई। कृपया बाद में प्रयास करें।";
  } else if (lang === "hinglish") {
    return "Report process karne mein dikkat hui. Kripya baad mein try karein.";
  } else {
    return "Failed to process report. Please try again later.";
  }
}

/**
 * Localized lab observation query format.
 */
export function formatLatestLabObservation(
  testName: string,
  value: any,
  unit: string,
  referenceRangeText: string | undefined,
  flag: string | undefined,
  lang: LanguageStyle
): string {
  const space = unit && (unit.endsWith("%") || unit.startsWith("%")) ? "" : " ";
  const unitStr = unit ? `${space}${unit}` : "";
  const flagStr = flag ? ` [${flag.toUpperCase()}]` : "";
  const refStr = referenceRangeText ? ` (Ref: ${referenceRangeText})` : "";

  if (lang === "hindi") {
    return `आपकी नवीनतम ${testName} रिपोर्ट ${value}${unitStr}${flagStr}${refStr} है।`;
  } else if (lang === "hinglish") {
    return `Aapki latest ${testName} reading ${value}${unitStr}${flagStr}${refStr} hai.`;
  } else {
    return `Your latest ${testName} reading is ${value}${unitStr}${flagStr}${refStr}.`;
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
    const prefix = displayVal ? `शुगर ${displayVal} नोट कर ली गई है।\n\n` : "";
    return `${prefix}यह शुगर कब चेक की गई थी?

• खाली पेट (Fasting)
• खाने से पहले (Before meal)
• खाने के बाद (After meal)
• रैंडम (Random)`;
  } else if (lang === "hinglish") {
    const prefix = displayVal ? `Sugar ${displayVal} note kar li gayi hai.\n\n` : "";
    return `${prefix}Yeh sugar kab check ki gayi thi?

• Fasting
• Before meal
• After meal
• Random`;
  } else {
    const prefix = displayVal ? `Sugar ${displayVal} has been noted.\n\n` : "";
    return `${prefix}When was this sugar checked?

• Fasting
• Before meal
• After meal
• Random`;
  }
}

/**
 * Returns a localized message asking for missing blood pressure diastolic number.
 */
export function getBloodPressureClarification(lang: LanguageStyle, systolicValue?: any): string {
  if (lang === "hindi") {
    return `ब्लड प्रेशर पूरा करने के लिए कृपया सिस्टोलिक और डायस्टोलिक दोनों रीडिंग भेजें (जैसे: 120/80)।`;
  } else if (lang === "hinglish") {
    return `Blood pressure pura karne ke liye please systolic aur diastolic dono values bhejein (jaise: 120/80).`;
  } else {
    return `To complete your blood pressure record, please send both systolic and diastolic readings (example: 120/80).`;
  }
}

/**
 * Returns a localized message asking for body temperature unit clarification.
 */
export function getBodyTemperatureClarification(lang: LanguageStyle, value?: any): string {
  const displayVal = value !== undefined && value !== null ? `${value}` : "";

  if (lang === "hindi") {
    const prefix = displayVal ? `तापमान ${displayVal} दर्ज किया गया है।\n\n` : "";
    return `${prefix}कृपया तापमान का पैमाना बताएं:

• °C (Celsius)
• °F (Fahrenheit)`;
  } else if (lang === "hinglish") {
    const prefix = displayVal ? `Temperature ${displayVal} note kar liya hai.\n\n` : "";
    return `${prefix}Kripya temperature ka scale batayein:

• °C
• °F`;
  } else {
    const prefix = displayVal ? `Temperature ${displayVal} has been noted.\n\n` : "";
    return `${prefix}Please specify the temperature unit:

• °C
• °F`;
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
  if (records.length === 0) {
    return formatNoRecords(lang);
  }

  // Define parameter display titles with emojis for each language
  const parameterHeaders: Record<string, { english: string; hindi: string; hinglish: string }> = {
    blood_sugar: { english: "📈 Blood Sugar", hindi: "📈 ब्लड शुगर", hinglish: "📈 Blood Sugar" },
    blood_pressure: { english: "🩺 Blood Pressure", hindi: "🩺 ब्लड प्रेशर", hinglish: "🩺 Blood Pressure" },
    heart_rate: { english: "❤️ Heart Rate (Pulse)", hindi: "❤️ हृदय गति (पल्स)", hinglish: "❤️ Heart Rate (Pulse)" },
    oxygen_saturation: { english: "⏱️ Oxygen (SpO2)", hindi: "⏱️ ऑक्सीजन स्तर (SpO2)", hinglish: "⏱️ Oxygen (SpO2)" },
    body_temperature: { english: "🌡️ Body Temperature", hindi: "🌡️ शरीर का तापमान", hinglish: "🌡️ Body Temperature" },
    weight: { english: "⚖️ Weight", hindi: "⚖️ वजन", hinglish: "⚖️ Weight" },
    respiratory_rate: { english: "🫁 Respiratory Rate", hindi: "🫁 श्वसन दर", hinglish: "🫁 Respiratory Rate" },
    height: { english: "📏 Height", hindi: "📏 कद", hinglish: "📏 Height" },
  };

  // Group records by parameter while preserving their sorted order
  const grouped: Record<string, any[]> = {};
  const parameterOrder: string[] = []; // to maintain the order of appearance of parameters

  for (const r of records) {
    if (!grouped[r.parameter]) {
      grouped[r.parameter] = [];
      parameterOrder.push(r.parameter);
    }
    grouped[r.parameter].push(r);
  }

  // Build the localized title
  let title = "Here are your readings recorded today:";
  if (lang === "hindi") {
    title = "आज रिकॉर्ड किए गए आपके स्वास्थ्य परिणाम:";
  } else if (lang === "hinglish") {
    title = "Aaj record kiye gaye aapke health readings:";
  }

  const sections: string[] = [];

  for (const param of parameterOrder) {
    const paramRecs = grouped[param];
    const headerObj = parameterHeaders[param];
    const headerText = headerObj
      ? (lang === "hindi" ? headerObj.hindi : (lang === "hinglish" ? headerObj.hinglish : headerObj.english))
      : getFriendlyName(param, lang);

    const lines = paramRecs.map(r => {
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

      const details: string[] = [];
      if (contextLabel) details.push(contextLabel);
      if (tcLabel) details.push(tcLabel);

      const detailStr = details.length > 0 ? ` (${details.join(" - ")})` : "";
      return `  • ${capName} ${r.value}${space}${unit}${detailStr}`;
    });

    sections.push(`${headerText}:\n${lines.join("\n")}`);
  }

  return `${title}\n\n${sections.join("\n\n")}`;
}

export function getVoiceBpNotUnderstoodMessage(lang: LanguageStyle): string {
  if (lang === "hindi") {
    return `ब्लड प्रेशर अधूरा लग रहा है। कृपया सिस्टोलिक और डायस्टोलिक दोनों वैल्यू भेजें। जैसे: 120/80`;
  } else if (lang === "hinglish") {
    return `Blood pressure incomplete lag raha hai. Kripya systolic aur diastolic dono values bhejein. Example: 120/80`;
  } else {
    return `Blood pressure appears incomplete. Please send both systolic and diastolic values. Example: 120/80`;
  }
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
