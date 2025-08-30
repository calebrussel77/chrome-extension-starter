import { Language, SmartTranslationConfig, SmartTranslationPreset } from "./types";

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

// Smart translation presets for common language pairs
export const SMART_TRANSLATION_PRESETS: SmartTranslationPreset[] = [
  {
    id: "french-english",
    name: "French ↔ American English",
    description: "Perfect for French learners and French-speaking professionals",
    config: {
      primaryLanguage: "fr",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "spanish-english",
    name: "Spanish ↔ American English",
    description: "Ideal for Spanish speakers and learners",
    config: {
      primaryLanguage: "es",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "german-english",
    name: "German ↔ American English", 
    description: "Great for German business and academic contexts",
    config: {
      primaryLanguage: "de",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "chinese-english",
    name: "Chinese ↔ American English",
    description: "Perfect for Chinese-English business communication",
    config: {
      primaryLanguage: "zh",
      secondaryLanguage: "en", 
      fallbackLanguage: "en"
    }
  },
  {
    id: "japanese-english",
    name: "Japanese ↔ American English",
    description: "Ideal for Japanese culture and business contexts",
    config: {
      primaryLanguage: "ja",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "italian-english",
    name: "Italian ↔ American English",
    description: "Great for Italian culture and travel contexts",
    config: {
      primaryLanguage: "it",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "portuguese-english",
    name: "Portuguese ↔ American English",
    description: "Perfect for Brazilian and Portuguese contexts",
    config: {
      primaryLanguage: "pt",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "russian-english",
    name: "Russian ↔ American English", 
    description: "Ideal for Russian speakers and business contexts",
    config: {
      primaryLanguage: "ru",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "korean-english",
    name: "Korean ↔ American English",
    description: "Great for Korean culture and K-pop contexts", 
    config: {
      primaryLanguage: "ko",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  },
  {
    id: "arabic-english",
    name: "Arabic ↔ American English",
    description: "Perfect for Arabic speakers and Middle Eastern contexts",
    config: {
      primaryLanguage: "ar",
      secondaryLanguage: "en",
      fallbackLanguage: "en"
    }
  }
];

// Default smart translation configuration (French ↔ American English)
export const DEFAULT_SMART_TRANSLATION_CONFIG: SmartTranslationConfig = {
  primaryLanguage: "fr",
  secondaryLanguage: "en", 
  fallbackLanguage: "en"
};

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
  smartTranslationConfig: DEFAULT_SMART_TRANSLATION_CONFIG,
  history: [],
};
