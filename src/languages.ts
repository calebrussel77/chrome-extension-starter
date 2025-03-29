import { Language } from "./types";

// List of languages supported by our translator
export const LANGUAGES: Language[] = [
  { code: "auto", name: "Détection automatique" },
  { code: "en", name: "Anglais" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Espagnol" },
  { code: "de", name: "Allemand" },
  { code: "it", name: "Italien" },
  { code: "pt", name: "Portugais" },
  { code: "ru", name: "Russe" },
  { code: "zh", name: "Chinois" },
  { code: "ja", name: "Japonais" },
  { code: "ko", name: "Coréen" },
  { code: "ar", name: "Arabe" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turc" },
  { code: "nl", name: "Néerlandais" },
  { code: "sv", name: "Suédois" },
  { code: "pl", name: "Polonais" },
  { code: "da", name: "Danois" },
  { code: "fi", name: "Finnois" },
  { code: "no", name: "Norvégien" },
  { code: "cs", name: "Tchèque" },
  { code: "hu", name: "Hongrois" },
  { code: "uk", name: "Ukrainien" },
  { code: "ro", name: "Roumain" },
  { code: "vi", name: "Vietnamien" },
  { code: "th", name: "Thaï" },
  { code: "id", name: "Indonésien" },
  { code: "ms", name: "Malais" },
  { code: "he", name: "Hébreu" },
  { code: "el", name: "Grec" },
];

// Default configuration values
// Default configuration values
export const DEFAULT_CONFIG = {
  apiKey: "",
  disabledSites: [] as string[],
  sourceLanguage: "auto",
  targetLanguage: "en",
  autoTranslate: true,
  enableAnimations: true,
  history: [],
};
