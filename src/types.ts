// Define types for our extension

// Smart translation configuration
export type SmartTranslationConfig = {
  primaryLanguage: string;
  secondaryLanguage: string;
  fallbackLanguage: string; // Language to use for unrecognized text
};

// Predefined smart translation presets
export type SmartTranslationPreset = {
  id: string;
  name: string;
  description: string;
  config: SmartTranslationConfig;
};

// Configuration stored in chrome.storage
export type ExtensionConfig = {
  googleApiKey: string;
  openaiApiKey: string;
  disabledSites: string[];
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  enableAnimations: boolean;
  customInstructions: string;
  smartTranslation: boolean;
  smartTranslationConfig: SmartTranslationConfig;
  history: HistoryItem[];
};

// History item for translations and transcriptions
export type HistoryItem = {
  id: string;
  type: "translation" | "transcription";
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
};

// Language supported by the extension
export type Language = {
  code: string;
  name: string;
};

// API response format for translation
export type TranslationResponse = {
  translatedText: string;
  detectedLanguage?: string;
  error?: string;
};

// Message types for communication between parts of the extension
export enum MessageType {
  TRANSLATE_SELECTION = "TRANSLATE_SELECTION",
  TOGGLE_SITE_DISABLED = "TOGGLE_SITE_DISABLED",
  GET_SITE_STATUS = "GET_SITE_STATUS",
  UPDATE_CONFIG = "UPDATE_CONFIG",
  GET_CONFIG = "GET_CONFIG",
  CONFIG_UPDATED = "CONFIG_UPDATED",
  PING = "PING",
  CONTENT_SCRIPT_READY = "CONTENT_SCRIPT_READY",
}

// Base message interface
export interface Message {
  type: MessageType;
}

// Translation request message
export interface TranslateSelectionMessage extends Message {
  type: MessageType.TRANSLATE_SELECTION;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

// Toggle site disabled message
export interface ToggleSiteDisabledMessage extends Message {
  type: MessageType.TOGGLE_SITE_DISABLED;
  site: string;
}

// Get site status message
export interface GetSiteStatusMessage extends Message {
  type: MessageType.GET_SITE_STATUS;
  site: string;
}

// Update config message
export interface UpdateConfigMessage extends Message {
  type: MessageType.UPDATE_CONFIG;
  config: Partial<ExtensionConfig>;
}

// Get config message
export interface GetConfigMessage extends Message {
  type: MessageType.GET_CONFIG;
}

// Content script ready message
export interface ContentScriptReadyMessage extends Message {
  type: MessageType.CONTENT_SCRIPT_READY;
}

// Config updated message (sent to content scripts when config changes)
export interface ConfigUpdatedMessage extends Message {
  type: MessageType.CONFIG_UPDATED;
  config: ExtensionConfig;
}
