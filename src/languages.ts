import { Language } from "./types";

// List of languages supported by our translator
export const LANGUAGES: Language[] = [
  { code: "auto", name: "Auto-detect" },
  { code: "en", name: "American English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "pl", name: "Polish" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "no", name: "Norwegian" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "uk", name: "Ukrainian" },
  { code: "ro", name: "Romanian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "he", name: "Hebrew" },
  { code: "el", name: "Greek" },
];

// Default configuration values
export const DEFAULT_CONFIG = {
  googleApiKey: "",
  openaiApiKey: "",
  disabledSites: [] as string[],
  sourceLanguage: "auto",
  targetLanguage: "en",
  autoTranslate: true,
  enableAnimations: true,
  customInstructions: "",
  smartTranslation: true,
  history: [],
};
