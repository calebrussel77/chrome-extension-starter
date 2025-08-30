import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  History,
  Info,
  Mic,
  Settings,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Button from "../../components/Button";
import HistoryTab from "../../components/HistoryTab";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import VoiceRecording from "../../components/VoiceRecording";
import { LANGUAGES } from "../../languages";
import { translateText, smartTranslateText } from "../../services/api";
import {
  addToHistory,
  clearHistory,
  deleteHistoryItem,
  getConfig,
  getHistory,
  getMicrophonePermission,
  updateConfig,
} from "../../services/storage";
import { HistoryItem, MessageType, SmartTranslationConfig } from "../../types";

import "../../chrome-extension/global.css";

const Popup: React.FC = () => {
  // State
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [smartTranslation, setSmartTranslation] = useState(true);
  const [smartTranslationConfig, setSmartTranslationConfig] = useState<SmartTranslationConfig>({
    primaryLanguage: "fr",
    secondaryLanguage: "en", 
    fallbackLanguage: "en"
  });
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [activeTab, setActiveTab] = useState<"translate" | "voice" | "history">(
    "translate"
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Add a microphone permission state
  const [microphonePermission, setMicrophonePermission] = useState<
    boolean | null
  >(null);

  // Load config and history on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConfig();
        setGoogleApiKey(config.googleApiKey);
        setOpenaiApiKey(config.openaiApiKey);
        setSourceLanguage(config.sourceLanguage);
        setTargetLanguage(config.targetLanguage);
        setIsAutoTranslate(config.autoTranslate);
        setEnableAnimations(config.enableAnimations);
        setCustomInstructions(config.customInstructions || "");
        setSmartTranslation(config.smartTranslation ?? true);
        setSmartTranslationConfig(config.smartTranslationConfig || {
          primaryLanguage: "fr",
          secondaryLanguage: "en", 
          fallbackLanguage: "en"
        });
        setShowCustomInstructions(
          !!(config.customInstructions && config.customInstructions.trim())
        );

        // Load history
        const historyItems = await getHistory();
        setHistory(historyItems);

        // Check microphone permission
        const hasMicPermission = await getMicrophonePermission();
        setMicrophonePermission(hasMicPermission);
      } catch (err) {
        console.error("Error loading config:", err);
        setError("Failed to load settings");
      }
    };

    loadConfig();
  }, []);

  // Save config when values change
  useEffect(() => {
    const saveConfig = async () => {
      try {
        await updateConfig({
          googleApiKey,
          openaiApiKey,
          sourceLanguage,
          targetLanguage,
          autoTranslate: isAutoTranslate,
          enableAnimations,
          customInstructions,
          smartTranslation,
          smartTranslationConfig,
        });
      } catch (err) {
        console.error("Error saving config:", err);
      }
    };

    saveConfig();
  }, [
    googleApiKey,
    openaiApiKey,
    sourceLanguage,
    targetLanguage,
    isAutoTranslate,
    enableAnimations,
    customInstructions,
    smartTranslation,
    smartTranslationConfig,
  ]);

  // Check if a site is disabled
  const [currentSite, setCurrentSite] = useState("");
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const currentTab = tabs[0];

        if (currentTab?.url) {
          const url = new URL(currentTab.url);
          setCurrentSite(url.hostname);

          // Check if site is disabled
          chrome.runtime.sendMessage(
            {
              type: MessageType.GET_SITE_STATUS,
              site: currentTab.url,
            },
            (response) => {
              if (response && typeof response.isDisabled === "boolean") {
                setIsSiteDisabled(response.isDisabled);
              }
            }
          );
        }
      } catch (err) {
        console.error("Error getting current tab:", err);
      }
    };

    getCurrentTab();
  }, []);

  // Toggle site disabled status
  const toggleSiteDisabled = async () => {
    try {
      if (!currentSite) return;

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const currentTab = tabs[0];

        if (currentTab?.url) {
          chrome.runtime.sendMessage(
            {
              type: MessageType.TOGGLE_SITE_DISABLED,
              site: currentTab.url,
            },
            (response) => {
              if (response && typeof response.isDisabled === "boolean") {
                setIsSiteDisabled(response.isDisabled);
              }
            }
          );
        }
      });
    } catch (err) {
      console.error("Error toggling site disabled:", err);
      setError("Failed to toggle site status");
    }
  };

  // Handle translation
  const handleTranslate = async () => {
    if (!googleApiKey) {
      setError("Google API key is required");
      return;
    }

    if (!inputText) {
      setError("Please enter text to translate");
      return;
    }

    setError("");
    setIsTranslating(true);

    try {
      const result = smartTranslation
        ? await smartTranslateText(
            inputText,
            googleApiKey,
            smartTranslationConfig,
            customInstructions
          )
        : await translateText(
            inputText,
            sourceLanguage,
            targetLanguage,
            googleApiKey,
            customInstructions
          );

      if (result.error) {
        setError(result.error);
      } else {
        setTranslatedText(result.translatedText);

        // Add to history
        await addToHistory({
          type: "translation",
          originalText: inputText,
          translatedText: result.translatedText,
          sourceLanguage: smartTranslation ? "auto" : sourceLanguage,
          targetLanguage: smartTranslation ? "auto" : targetLanguage,
        });

        // Refresh history
        const historyItems = await getHistory();
        setHistory(historyItems);
      }
    } catch (err) {
      console.error("Translation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsTranslating(false);
    }
  };

  // History management functions
  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItem(id);
    const updatedHistory = await getHistory();
    setHistory(updatedHistory);
  };

  const handleCopyFromHistory = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text:", err);
      setError("Failed to copy to clipboard");
    });
  };

  // Copy translated text to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      // Show a temporary success message or toast here
    } catch (err) {
      console.error("Copy error:", err);
      setError("Failed to copy to clipboard");
    }
  };

  return (
    <div className="min-w-[450px] min-h-[540px] p-5 bg-white text-gray-900 shadow-sm rounded-lg">
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <img
            src="/public/48.png"
            alt="AI Translator Pro"
            className="w-8 h-8 rounded-md shadow-sm"
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI Translator Pro
          </h1>
        </div>

        <a
          href="options.html"
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
          target="_blank"
          rel="noopener noreferrer"
          title="Settings"
        >
          <Settings size={20} />
        </a>
      </header>

      {/* API Key Warning */}
      {(!googleApiKey || !openaiApiKey) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 shadow-sm"
        >
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                Please configure your API keys in the settings.
                {!googleApiKey &&
                  " Google API key is required for translation."}
                {!openaiApiKey &&
                  " OpenAI API key is required for voice features."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Site Status */}
      {currentSite && (
        <div className="flex items-center justify-between mb-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-gray-500" />
            <div className="text-sm text-gray-600">
              Current site: <span className="font-medium">{currentSite}</span>
            </div>
          </div>

          <Toggle
            checked={!isSiteDisabled}
            onChange={() => toggleSiteDisabled()}
            size="sm"
            label={isSiteDisabled ? "Enable" : "Disable"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-5 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-2 ${
            activeTab === "translate"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("translate")}
        >
          <Globe size={16} />
          Translate
        </button>

        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-2 ${
            activeTab === "voice"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("voice")}
        >
          <Mic size={16} />
          Voice to Text
        </button>

        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-2 ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <History size={16} />
          History
        </button>
      </div>

      {/* Smart Translation Toggle */}
      <div className="flex items-center justify-between mb-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <Toggle
          checked={smartTranslation}
          onChange={setSmartTranslation}
          label="Smart Translation"
          description={`Auto-detect and translate between ${
            LANGUAGES.find(lang => lang.code === smartTranslationConfig.primaryLanguage)?.name || smartTranslationConfig.primaryLanguage
          } and ${
            LANGUAGES.find(lang => lang.code === smartTranslationConfig.secondaryLanguage)?.name || smartTranslationConfig.secondaryLanguage
          }`}
        />
      </div>

      {/* Language Selectors (only shown when smart translation is off) */}
      {!smartTranslation && (
        <div className="flex gap-3 mb-5">
          <Select
            label="Source language"
            options={LANGUAGES.map((lang) => ({
              value: lang.code,
              label: lang.name,
            }))}
            value={sourceLanguage}
            onChange={setSourceLanguage}
            fullWidth
          />

          <div className="flex items-center mt-6">
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
              onClick={() => {
                const temp = sourceLanguage;
                setSourceLanguage(targetLanguage);
                setTargetLanguage(temp);
              }}
              title="Switch languages"
            >
              <ArrowLeftRight size={18} />
            </button>
          </div>

          <Select
            label="Target language"
            options={LANGUAGES.filter((lang) => lang.code !== "auto").map(
              (lang) => ({
                value: lang.code,
                label: lang.name,
              })
            )}
            value={targetLanguage}
            onChange={setTargetLanguage}
            fullWidth
          />
        </div>
      )}

      {/* Auto Translate Toggle */}
      <div className="flex items-center justify-between mb-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <Toggle
          checked={isAutoTranslate}
          onChange={setIsAutoTranslate}
          label="Automatic translation"
          description="Automatically translate selected text"
        />
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 shadow-sm"
        >
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "translate" ? (
          <motion.div
            key="translate"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Custom Instructions */}
            <div className="mb-5">
              <button
                onClick={() =>
                  setShowCustomInstructions(!showCustomInstructions)
                }
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-700">
                    Custom Instructions
                  </div>
                  {customInstructions && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                {showCustomInstructions ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </button>

              <AnimatePresence>
                {showCustomInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <label
                        htmlFor="customInstructions"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Additional context for translation
                      </label>
                      <textarea
                        id="customInstructions"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        className="block w-full rounded-lg border px-3 py-2 border-blue-200 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 text-sm"
                        rows={3}
                        placeholder="e.g., 'This is a technical document about software development' or 'Translate in a formal tone' or 'Keep brand names untranslated'..."
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        💡 Provide context, tone preferences, or specific
                        instructions to improve translation quality.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Text */}
            <div className="mb-5">
              <label
                htmlFor="inputText"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Text to translate
              </label>
              <textarea
                id="inputText"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="block w-full rounded-lg border px-3 py-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                rows={6}
                placeholder="Enter text to translate..."
              />
            </div>

            {/* Translate Button */}
            <div className="mb-5">
              <Button
                variant="primary"
                size="md"
                fullWidth
                isLoading={isTranslating}
                onClick={handleTranslate}
                disabled={!googleApiKey || !inputText}
                className="rounded-lg shadow-sm hover:shadow transition-all duration-200"
              >
                Translate
              </Button>
            </div>

            {/* Translation Result */}
            {translatedText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Translation
                  </label>

                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-sm">{translatedText}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === "voice" ? (
          <motion.div
            key="voice"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <VoiceRecording
              googleApiKey={googleApiKey}
              openaiApiKey={openaiApiKey}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              isAutoTranslate={isAutoTranslate}
              microphonePermission={microphonePermission}
              customInstructions={customInstructions}
              smartTranslation={smartTranslation}
              smartTranslationConfig={smartTranslationConfig}
              onError={setError}
              onInputTextChange={setInputText}
              onTranslatedTextChange={setTranslatedText}
              onHistoryUpdate={setHistory}
              inputText={inputText}
              translatedText={translatedText}
            />
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <HistoryTab
              history={history}
              onCopyText={handleCopyFromHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<Popup />);

export default Popup;
