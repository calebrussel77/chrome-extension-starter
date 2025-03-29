import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Button from "../../components/Button";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import { LANGUAGES } from "../../languages";
import { speechToText, translateText } from "../../services/api";
import { getConfig, updateConfig } from "../../services/storage";
import { MessageType } from "../../types";

import "../../chrome-extension/global.css";

const Popup = () => {
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
  const [activeTab, setActiveTab] = useState<"translate" | "voice">(
    "translate"
  );

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConfig();
        setApiKey(config.apiKey);
        setSourceLanguage(config.sourceLanguage);
        setTargetLanguage(config.targetLanguage);
        setIsAutoTranslate(config.autoTranslate);
        setEnableAnimations(config.enableAnimations);
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
            }
          }
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
    <div className="min-w-[350px] p-4 bg-white text-gray-900">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img
            src="/public/48.png"
            alt="AI Translator Pro"
            className="w-8 h-8"
          />
          <h1 className="text-lg font-bold">AI Translator Pro</h1>
        </div>

        <a
          href="options.html"
          className="text-blue-600 hover:text-blue-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </a>
      </header>

      {/* API Key Warning */}
      {!apiKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-yellow-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Veuillez configurer votre clé API OpenAI dans les paramètres.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Site Status */}
      {currentSite && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Site actuel: <span className="font-medium">{currentSite}</span>
          </div>

          <Toggle
            checked={!isSiteDisabled}
            onChange={() => toggleSiteDisabled()}
            size="sm"
            label={isSiteDisabled ? "Activer" : "Désactiver"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-4 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "translate"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
          onClick={() => setActiveTab("translate")}
        >
          Traduire
        </button>

        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "voice"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
          onClick={() => setActiveTab("voice")}
        >
          Voice to Text
        </button>
      </div>

      {/* Language Selectors */}
      <div className="flex gap-2 mb-4">
        <Select
          label="Langue source"
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
            className="p-1 text-gray-500 hover:text-gray-700"
            onClick={() => {
              const temp = sourceLanguage;
              setSourceLanguage(targetLanguage);
              setTargetLanguage(temp);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </button>
        </div>

        <Select
          label="Langue cible"
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
      <div className="flex items-center justify-between mb-4">
        <Toggle
          checked={isAutoTranslate}
          onChange={setIsAutoTranslate}
          label="Traduction automatique"
          description="Traduire automatiquement le texte sélectionné"
        />
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-400 p-3 mb-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
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
            <div className="mb-4">
              <label
                htmlFor="inputText"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Texte à traduire
              </label>
              <textarea
                id="inputText"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Entrez le texte à traduire..."
              />
            </div>

            {/* Translate Button */}
            <div className="mb-4">
              <Button
                variant="primary"
                size="md"
                fullWidth
                isLoading={isTranslating}
                onClick={handleTranslate}
                disabled={!apiKey || !inputText}
              >
                Traduire
              </Button>
            </div>

            {/* Translation Result */}
            {translatedText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Traduction
                  </label>

                  <button
                    onClick={copyToClipboard}
                    className="text-gray-500 hover:text-gray-700"
                    title="Copier"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                      />
                    </svg>
                  </button>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm">{translatedText}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="voice"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Appuyez sur le bouton pour commencer l'enregistrement vocal
              </p>

              <Button
                variant={isRecording ? "secondary" : "primary"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                isLoading={isTranslating}
                disabled={!apiKey}
                className="rounded-full p-4"
              >
                {isRecording ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-10 h-10"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-10 h-10"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </Button>

              <p className="text-sm font-medium mt-2">
                {isRecording
                  ? "Enregistrement en cours..."
                  : "Prêt à enregistrer"}
              </p>
            </div>

            {/* Input Text */}
            {inputText && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Texte transcrit
                  </label>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm">{inputText}</p>
                </div>
              </div>
            )}

            {/* Translation Result */}
            {translatedText && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Traduction
                  </label>

                  <button
                    onClick={copyToClipboard}
                    className="text-gray-500 hover:text-gray-700"
                    title="Copier"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                      />
                    </svg>
                  </button>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm">{translatedText}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<Popup />);

export default Popup;
