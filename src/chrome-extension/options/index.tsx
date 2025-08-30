import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import { LANGUAGES, SMART_TRANSLATION_PRESETS } from "../../languages";
import {
  getConfig,
  getMicrophonePermission,
  setMicrophonePermission,
  updateConfig,
} from "../../services/storage";
import { SmartTranslationConfig } from "../../types";

import "../../chrome-extension/global.css";

const Options = () => {
  // State
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [smartTranslation, setSmartTranslation] = useState(true);
  const [smartTranslationConfig, setSmartTranslationConfig] = useState<SmartTranslationConfig>({
    primaryLanguage: "fr",
    secondaryLanguage: "en",
    fallbackLanguage: "en"
  });
  const [selectedPreset, setSelectedPreset] = useState("french-english");
  const [customSmartTranslation, setCustomSmartTranslation] = useState(false);
  const [disabledSites, setDisabledSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Microphone permission states
  const [micPermission, setMicPermission] = useState<
    "granted" | "denied" | "prompt" | "checking"
  >("checking");
  const [isMicTesting, setIsMicTesting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load config on mount
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
        setSmartTranslation(config.smartTranslation ?? true);
        setSmartTranslationConfig(config.smartTranslationConfig || {
          primaryLanguage: "fr",
          secondaryLanguage: "en", 
          fallbackLanguage: "en"
        });
        
        // Find matching preset or set custom
        const matchingPreset = SMART_TRANSLATION_PRESETS.find(preset => 
          preset.config.primaryLanguage === (config.smartTranslationConfig?.primaryLanguage || "fr") &&
          preset.config.secondaryLanguage === (config.smartTranslationConfig?.secondaryLanguage || "en") &&
          preset.config.fallbackLanguage === (config.smartTranslationConfig?.fallbackLanguage || "en")
        );
        
        if (matchingPreset) {
          setSelectedPreset(matchingPreset.id);
          setCustomSmartTranslation(false);
        } else {
          setSelectedPreset("custom");
          setCustomSmartTranslation(true);
        }
        
        setDisabledSites(config.disabledSites);
      } catch (err) {
        console.error("Error loading config:", err);
        setError("Failed to load settings");
      }
    };

    loadConfig();
    checkMicrophonePermission();
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    setMicPermission("checking");
    try {
      // First check if we have stored the permission
      const storedPermission = await getMicrophonePermission();

      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        const currentState = permissionStatus.state as
          | "granted"
          | "denied"
          | "prompt";
        setMicPermission(currentState);

        // Update stored permission if it's granted
        if (currentState === "granted") {
          await setMicrophonePermission(true);
        } else if (currentState === "denied") {
          await setMicrophonePermission(false);
        }

        // Listen for permission changes
        permissionStatus.addEventListener("change", async () => {
          const newState = permissionStatus.state as
            | "granted"
            | "denied"
            | "prompt";
          setMicPermission(newState);

          if (newState === "granted") {
            await setMicrophonePermission(true);
          } else if (newState === "denied") {
            await setMicrophonePermission(false);
          }
        });
      } else if (storedPermission) {
        // If Permissions API is not available but we have stored permission
        setMicPermission("granted");
      } else {
        // Fallback if Permissions API is not available
        setMicPermission("prompt");
      }
    } catch (err) {
      console.error("Error checking microphone permission:", err);
      setMicPermission("prompt");
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately to not keep the microphone active
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      await setMicrophonePermission(true);
      return true;
    } catch (err) {
      console.error("Error requesting microphone permission:", err);
      setMicPermission("denied");
      await setMicrophonePermission(false);
      return false;
    }
  };

  // Test microphone
  const testMicrophone = async () => {
    setIsMicTesting(true);
    try {
      // First ensure we have permission
      const hasPermission =
        micPermission === "granted" || (await requestMicrophonePermission());
      if (!hasPermission) {
        setError("Microphone access denied. Please grant permission.");
        setIsMicTesting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio feedback element
      const audioFeedback = new Audio();
      audioFeedback.srcObject = stream;
      audioFeedback.play();

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        audioFeedback.pause();
        audioFeedback.srcObject = null;

        // Create audio playback from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        setIsMicTesting(false);
      };

      // Start recording for 3 seconds
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (err) {
      console.error("Error testing microphone:", err);
      setError(
        "Failed to test microphone: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      setIsMicTesting(false);
    }
  };

  // Cancel microphone test
  const cancelMicTest = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Save config
  const saveConfig = async () => {
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      await updateConfig({
        googleApiKey,
        openaiApiKey,
        sourceLanguage,
        targetLanguage,
        autoTranslate: isAutoTranslate,
        enableAnimations,
        smartTranslation,
        smartTranslationConfig,
        disabledSites,
      });

      setSaveSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error saving config:", err);
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Add disabled site
  const addDisabledSite = () => {
    if (!newSite) return;

    try {
      // Simple URL validation
      let hostname = newSite;

      // Try to extract hostname from URL if full URL is provided
      try {
        const url = new URL(
          newSite.startsWith("http") ? newSite : `https://${newSite}`
        );
        hostname = url.hostname;
      } catch {
        // If URL parsing fails, just use the input as is
      }

      if (!disabledSites.includes(hostname)) {
        setDisabledSites([...disabledSites, hostname]);
        setNewSite("");
      }
    } catch (err) {
      console.error("Error adding disabled site:", err);
      setError("Invalid site format");
    }
  };

  // Remove disabled site
  const removeDisabledSite = (site: string) => {
    setDisabledSites(disabledSites.filter((s) => s !== site));
  };

  // Handle smart translation preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId === "custom") {
      setCustomSmartTranslation(true);
    } else {
      setCustomSmartTranslation(false);
      const preset = SMART_TRANSLATION_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setSmartTranslationConfig(preset.config);
      }
    }
  };

  // Handle custom smart translation config changes
  const handleSmartTranslationConfigChange = (field: keyof SmartTranslationConfig, value: string) => {
    setSmartTranslationConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get permission status UI elements
  const getPermissionStatusUI = () => {
    if (micPermission === "checking") {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse mr-2"></div>
          <span className="text-sm text-yellow-600">
            Checking microphone permission...
          </span>
        </div>
      );
    } else if (micPermission === "granted") {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
          <span className="text-sm text-green-600">
            Microphone access granted
          </span>
        </div>
      );
    } else if (micPermission === "denied") {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span className="text-sm text-red-600">
            Microphone access denied. Please allow it in your browser settings.
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-sm text-yellow-600">
            Microphone permission not yet requested
          </span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img
            src="/public/48.png"
            alt="AI Translator Pro"
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold">AI Translator Pro - Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure your API keys and customize translation options.
        </p>
      </header>

      {/* API Key Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4">API Keys</h2>
        <p className="text-sm text-gray-600 mb-4">
          Set up your API keys to access AI features.
        </p>

        <div className="mb-4">
          <Input
            label="Google API Key"
            value={googleApiKey}
            onChange={setGoogleApiKey}
            fullWidth
            type="password"
            placeholder="Enter your Google API key..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google AI Studio
            </a>{" "}
            (for translation)
          </p>
        </div>

        <div className="mb-4">
          <Input
            label="OpenAI API Key"
            value={openaiApiKey}
            onChange={setOpenaiApiKey}
            fullWidth
            type="password"
            placeholder="Enter your OpenAI API key..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              OpenAI Platform
            </a>{" "}
            (for speech-to-text)
          </p>
        </div>
      </section>

      {/* Microphone Permission Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4">Microphone Access</h2>
        <p className="text-sm text-gray-600 mb-4">
          Grant microphone access to use voice-to-text features.
        </p>

        <div className="mb-4">{getPermissionStatusUI()}</div>

        <div className="flex space-x-2">
          {micPermission !== "granted" && (
            <Button
              variant="primary"
              onClick={requestMicrophonePermission}
              disabled={micPermission === "checking"}
            >
              Allow Microphone Access
            </Button>
          )}

          <Button
            variant={isMicTesting ? "secondary" : "outline"}
            onClick={isMicTesting ? cancelMicTest : testMicrophone}
            disabled={
              micPermission === "denied" || micPermission === "checking"
            }
          >
            {isMicTesting ? "Stop Test" : "Test Microphone"}
          </Button>
        </div>

        {isMicTesting && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
              <p className="text-sm text-blue-700">
                Recording in progress... Speak now to test your microphone.
                You'll hear your recording after 3 seconds.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Translation Options */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4">Translation Options</h2>

        <div className="mb-4">
          <Toggle
            checked={smartTranslation}
            onChange={setSmartTranslation}
            label="Smart Translation"
            description="Auto-detect and translate between French and American English"
          />
        </div>

        {!smartTranslation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Select
              label="Default Source Language"
              options={LANGUAGES.map((lang) => ({
                value: lang.code,
                label: lang.name,
              }))}
              value={sourceLanguage}
              onChange={setSourceLanguage}
              fullWidth
            />

            <Select
              label="Default Target Language"
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

        <div className="mb-4">
          <Toggle
            checked={isAutoTranslate}
            onChange={setIsAutoTranslate}
            label="Automatic Translation"
            description="Automatically translate selected text"
          />
        </div>

        <div className="mb-4">
          <Toggle
            checked={enableAnimations}
            onChange={setEnableAnimations}
            label="Enable Animations"
            description="Enable UI animations"
          />
        </div>
      </section>

      {/* Smart Translation Configuration */}
      {smartTranslation && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
          <h2 className="text-lg font-medium mb-4">Smart Translation Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure which languages your smart translation should handle automatically.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose a Preset or Custom Configuration
            </label>
            
            {/* Preset Selection */}
            <div className="grid gap-3 mb-4">
              {SMART_TRANSLATION_PRESETS.map((preset) => (
                <label key={preset.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="smartTranslationPreset"
                    value={preset.id}
                    checked={selectedPreset === preset.id}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{preset.name}</div>
                    <div className="text-sm text-gray-600">{preset.description}</div>
                  </div>
                </label>
              ))}
              
              {/* Custom Option */}
              <label className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="smartTranslationPreset"
                  value="custom"
                  checked={selectedPreset === "custom"}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Custom Configuration</div>
                  <div className="text-sm text-gray-600">Configure your own language pair</div>
                </div>
              </label>
            </div>

            {/* Custom Configuration UI */}
            {customSmartTranslation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <h3 className="font-medium text-gray-900 mb-3">Custom Language Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Language
                    </label>
                    <Select
                      options={LANGUAGES.filter(lang => lang.code !== "auto").map(lang => ({
                        value: lang.code,
                        label: lang.name,
                      }))}
                      value={smartTranslationConfig.primaryLanguage}
                      onChange={(value) => handleSmartTranslationConfigChange("primaryLanguage", value)}
                      fullWidth
                    />
                    <p className="text-xs text-gray-500 mt-1">Your main working language</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Language
                    </label>
                    <Select
                      options={LANGUAGES.filter(lang => lang.code !== "auto").map(lang => ({
                        value: lang.code,
                        label: lang.name,
                      }))}
                      value={smartTranslationConfig.secondaryLanguage}
                      onChange={(value) => handleSmartTranslationConfigChange("secondaryLanguage", value)}
                      fullWidth
                    />
                    <p className="text-xs text-gray-500 mt-1">Language to translate to/from</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fallback Language
                    </label>
                    <Select
                      options={LANGUAGES.filter(lang => lang.code !== "auto").map(lang => ({
                        value: lang.code,
                        label: lang.name,
                      }))}
                      value={smartTranslationConfig.fallbackLanguage}
                      onChange={(value) => handleSmartTranslationConfigChange("fallbackLanguage", value)}
                      fullWidth
                    />
                    <p className="text-xs text-gray-500 mt-1">For unrecognized languages</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> Text in your primary language gets translated to your secondary language, 
                    and vice versa. Any other language gets translated to your fallback language.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Disabled Sites */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4">Disabled Websites</h2>
        <p className="text-sm text-gray-600 mb-4">
          The extension will not work on these websites.
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            value={newSite}
            onChange={setNewSite}
            placeholder="example.com"
            fullWidth
          />

          <Button onClick={addDisabledSite} disabled={!newSite}>
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {disabledSites.length === 0 ? (
            <p className="text-sm text-gray-500">No disabled websites</p>
          ) : (
            disabledSites.map((site) => (
              <div
                key={site}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm">{site}</span>
                <button
                  onClick={() => removeDisabledSite(site)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                  title="Remove website"
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
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Save Button */}
      <div className="w-full flex justify-end items-center gap-4">
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600"
          >
            {error}
          </motion.p>
        )}

        {saveSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600"
          >
            Settings saved successfully!
          </motion.p>
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={saveConfig}
          isLoading={isSaving}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<Options />);

export default Options;
