import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Copy,
  Globe,
  History,
  Info,
  Mic,
  Settings,
  Square,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Button from "../../components/Button";
import HistoryTab from "../../components/HistoryTab";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import { LANGUAGES } from "../../languages";
import { speechToText, translateText } from "../../services/api";
import {
  addToHistory,
  clearHistory,
  deleteHistoryItem,
  getConfig,
  getHistory,
  updateConfig,
} from "../../services/storage";
import { HistoryItem, MessageType } from "../../types";

import "../../chrome-extension/global.css";

const Popup: React.FC = () => {
  // State
  const [apiKey, setApiKey] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [activeTab, setActiveTab] = useState<"translate" | "voice" | "history">(
    "translate"
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load config and history on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConfig();
        setApiKey(config.apiKey);
        setSourceLanguage(config.sourceLanguage);
        setTargetLanguage(config.targetLanguage);
        setIsAutoTranslate(config.autoTranslate);
        setEnableAnimations(config.enableAnimations);

        // Load history
        const historyItems = await getHistory();
        setHistory(historyItems);
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
          apiKey,
          sourceLanguage,
          targetLanguage,
          autoTranslate: isAutoTranslate,
          enableAnimations,
        });
      } catch (err) {
        console.error("Error saving config:", err);
      }
    };

    saveConfig();
  }, [
    apiKey,
    sourceLanguage,
    targetLanguage,
    isAutoTranslate,
    enableAnimations,
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
    if (!apiKey) {
      setError("API key is required");
      return;
    }

    if (!inputText) {
      setError("Please enter text to translate");
      return;
    }

    setError("");
    setIsTranslating(true);

    try {
      const result = await translateText(
        inputText,
        sourceLanguage,
        targetLanguage,
        apiKey
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
          sourceLanguage,
          targetLanguage,
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

  // Handle recording for speech to text
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        try {
          setIsTranslating(true);
          const transcribedText = await speechToText(audioBlob, apiKey);
          setInputText(transcribedText);

          // Add to history as transcription
          await addToHistory({
            type: "transcription",
            originalText: transcribedText,
            translatedText: transcribedText,
            sourceLanguage: "auto",
            targetLanguage: "auto",
          });

          // Auto-translate if enabled
          if (isAutoTranslate) {
            const result = await translateText(
              transcribedText,
              sourceLanguage,
              targetLanguage,
              apiKey
            );

            if (result.error) {
              setError(result.error);
            } else {
              setTranslatedText(result.translatedText);

              // Add to history as translation
              await addToHistory({
                type: "translation",
                originalText: transcribedText,
                translatedText: result.translatedText,
                sourceLanguage,
                targetLanguage,
              });
            }
          }

          // Refresh history
          const historyItems = await getHistory();
          setHistory(historyItems);
        } catch (err) {
          console.error("Speech to text error:", err);
          setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
          setIsTranslating(false);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone");
    }
  };

  // History management functions
  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear all history?")) {
      await clearHistory();
      setHistory([]);
    }
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
      {!apiKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 shadow-sm"
        >
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                Please configure your OpenAI API key in the settings.
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

      {/* Language Selectors */}
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
                disabled={!apiKey || !inputText}
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
            <div className="flex flex-col items-center mb-5">
              <p className="text-sm text-gray-600 mb-4">
                Press the button to start voice recording
              </p>

              <Button
                variant={isRecording ? "secondary" : "primary"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                isLoading={isTranslating}
                disabled={!apiKey}
                className={`rounded-full p-5 shadow-md hover:shadow-lg transition-all duration-200 ${
                  isRecording ? "bg-red-100 hover:bg-red-200" : ""
                }`}
              >
                {isRecording ? (
                  <Square size={32} className="text-red-600" />
                ) : (
                  <Mic size={32} />
                )}
              </Button>

              <p className="text-sm font-medium mt-3">
                {isRecording ? (
                  <span className="flex items-center gap-2 text-red-600">
                    <span className="animate-pulse">●</span> Recording in
                    progress...
                  </span>
                ) : (
                  "Ready to record"
                )}
              </p>
            </div>

            {/* Input Text */}
            {inputText && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Transcribed text
                  </label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-sm">{inputText}</p>
                </div>
              </div>
            )}

            {/* Translation Result */}
            {translatedText && (
              <div className="mb-4">
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
              </div>
            )}
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
