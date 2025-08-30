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
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import HistoryTab from "../../components/HistoryTab";
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
import { useTheme } from "next-themes";

// Import mock Chrome APIs for development
import "../../dev-mock-chrome";
import "../../chrome-extension/global.css";

const PopupContent: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
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

        // Set theme from config
        if (config.theme) {
          setTheme(config.theme);
        }

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
  }, [setTheme]);

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
          theme: theme as "light" | "dark" | "system",
        });
      } catch (err) {
        console.error("Error saving config:", err);
      }
    };

    if (theme) {
      saveConfig();
    }
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
    theme,
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
    <div className="w-[450px] min-h-[540px] bg-background text-foreground">
      <Card className="h-full border-0 rounded-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/public/48.png"
                alt="AI Translator Pro"
                className="w-8 h-8 rounded-md"
              />
              <CardTitle className="text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                AI Translator Pro
              </CardTitle>
            </div>

            <a
              href="options.html"
              className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              title="Settings"
            >
              <Settings size={18} />
            </a>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* API Key Warning */}
          {(!googleApiKey || !openaiApiKey) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  Please configure your API keys in the settings.
                  {!googleApiKey &&
                    " Google API key is required for translation."}
                  {!openaiApiKey &&
                    " OpenAI API key is required for voice features."}
                </div>
              </div>
            </motion.div>
          )}

          {/* Site Status */}
          {currentSite && (
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-muted-foreground" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Current site:{" "}
                    </span>
                    <span className="font-medium">{currentSite}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isSiteDisabled ? "Disabled" : "Enabled"}
                  </span>
                  <Switch
                    checked={!isSiteDisabled}
                    onCheckedChange={() => toggleSiteDisabled()}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: "translate", label: "Translate", icon: Globe },
              { id: "voice", label: "Voice", icon: Mic },
              { id: "history", label: "History", icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center justify-center gap-2 ${
                  activeTab === id
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                onClick={() =>
                  setActiveTab(id as "translate" | "voice" | "history")
                }
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Smart Translation Toggle */}
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Smart Translation</div>
                <div className="text-xs text-muted-foreground">
                  Auto-detect and translate between{" "}
                  {LANGUAGES.find(
                    (lang) =>
                      lang.code === smartTranslationConfig.primaryLanguage
                  )?.name || smartTranslationConfig.primaryLanguage}{" "}
                  and{" "}
                  {LANGUAGES.find(
                    (lang) =>
                      lang.code === smartTranslationConfig.secondaryLanguage
                  )?.name || smartTranslationConfig.secondaryLanguage}
                </div>
              </div>
              <Switch
                checked={smartTranslation}
                onCheckedChange={setSmartTranslation}
              />
            </div>
          </Card>

          {/* Language Selectors (only shown when smart translation is off) */}
          {!smartTranslation && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={sourceLanguage}
                  onValueChange={setSourceLanguage}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => {
                  const temp = sourceLanguage;
                  setSourceLanguage(targetLanguage);
                  setTargetLanguage(temp);
                }}
                title="Switch languages"
              >
                <ArrowLeftRight size={14} />
              </Button>

              <div className="flex-1">
                <Select
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.filter((lang) => lang.code !== "auto").map(
                      (lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Auto Translate Toggle */}
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Automatic translation</div>
                <div className="text-xs text-muted-foreground">
                  Automatically translate selected text
                </div>
              </div>
              <Switch
                checked={isAutoTranslate}
                onCheckedChange={setIsAutoTranslate}
              />
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
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
                className="space-y-4"
              >
                {/* Custom Instructions */}
                <div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setShowCustomInstructions(!showCustomInstructions)
                    }
                    className="w-full justify-between p-2 h-auto text-left hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Custom Instructions
                      </span>
                      {customInstructions && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                    {showCustomInstructions ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showCustomInstructions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-3 bg-primary/5 rounded-lg border">
                          <label
                            htmlFor="customInstructions"
                            className="block text-sm font-medium mb-2"
                          >
                            Additional context for translation
                          </label>
                          <Textarea
                            id="customInstructions"
                            value={customInstructions}
                            onChange={(e) =>
                              setCustomInstructions(e.target.value)
                            }
                            className="text-sm resize-none"
                            rows={3}
                            placeholder="e.g., 'This is a technical document about software development' or 'Translate in a formal tone' or 'Keep brand names untranslated'..."
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Provide context, tone preferences, or specific
                            instructions to improve translation quality.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input Text */}
                <div>
                  <label
                    htmlFor="inputText"
                    className="block text-sm font-medium mb-2"
                  >
                    Text to translate
                  </label>
                  <Textarea
                    id="inputText"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="resize-none"
                    rows={4}
                    placeholder="Enter text to translate..."
                  />
                </div>

                {/* Translate Button */}
                <Button
                  onClick={handleTranslate}
                  disabled={!googleApiKey || !inputText || isTranslating}
                  className="w-full"
                >
                  {isTranslating ? "Translating..." : "Translate"}
                </Button>

                {/* Translation Result */}
                {translatedText && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Translation
                      </label>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-6 px-2"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    <Card className="p-3 bg-muted/50">
                      <p className="text-sm">{translatedText}</p>
                    </Card>
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
        </CardContent>
      </Card>
    </div>
  );
};

const Popup: React.FC = () => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PopupContent />
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Popup />);

export default Popup;