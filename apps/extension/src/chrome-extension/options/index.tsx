import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggleWithLabel } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LANGUAGES, SMART_TRANSLATION_PRESETS } from "../../languages";
import {
  getConfig,
  getMicrophonePermission,
  setMicrophonePermission,
  updateConfig,
} from "../../services/storage";
import { SmartTranslationConfig } from "../../types";

// Import mock Chrome APIs for development
import "../../chrome-extension/global.css";
import "../../dev-mock-chrome";

const OptionsContent = () => {
  const { theme, setTheme } = useTheme();

  // State
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [smartTranslation, setSmartTranslation] = useState(true);
  const [smartTranslationConfig, setSmartTranslationConfig] =
    useState<SmartTranslationConfig>({
      primaryLanguage: "fr",
      secondaryLanguage: "en",
      fallbackLanguage: "en",
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
        setOpenaiApiKey(config.openaiApiKey);
        setSourceLanguage(config.sourceLanguage);
        setTargetLanguage(config.targetLanguage);
        setIsAutoTranslate(config.autoTranslate);
        setEnableAnimations(config.enableAnimations);
        setSmartTranslation(config.smartTranslation ?? true);
        setSmartTranslationConfig(
          config.smartTranslationConfig || {
            primaryLanguage: "fr",
            secondaryLanguage: "en",
            fallbackLanguage: "en",
          }
        );

        // Set theme from config
        if (config.theme) {
          setTheme(config.theme);
        }

        // Find matching preset or set custom
        const matchingPreset = SMART_TRANSLATION_PRESETS.find(
          (preset) =>
            preset.config.primaryLanguage ===
              (config.smartTranslationConfig?.primaryLanguage || "fr") &&
            preset.config.secondaryLanguage ===
              (config.smartTranslationConfig?.secondaryLanguage || "en") &&
            preset.config.fallbackLanguage ===
              (config.smartTranslationConfig?.fallbackLanguage || "en")
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
  }, [setTheme]);

  // Save theme when it changes (debounced)
  useEffect(() => {
    if (!theme) return;

    const timeoutId = setTimeout(async () => {
      try {
        await updateConfig({ theme: theme as "light" | "dark" | "system" });
      } catch (err) {
        console.error("Error saving theme:", err);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [theme]);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    setMicPermission("checking");
    try {
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

        if (currentState === "granted") {
          await setMicrophonePermission(true);
        } else if (currentState === "denied") {
          await setMicrophonePermission(false);
        }

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
        setMicPermission("granted");
      } else {
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

      const audioFeedback = new Audio();
      audioFeedback.srcObject = stream;
      audioFeedback.play();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        audioFeedback.pause();
        audioFeedback.srcObject = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        stream.getTracks().forEach((track) => track.stop());
        setIsMicTesting(false);
      };

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
        openaiApiKey,
        sourceLanguage,
        targetLanguage,
        autoTranslate: isAutoTranslate,
        enableAnimations,
        smartTranslation,
        smartTranslationConfig,
        disabledSites,
        theme: theme as "light" | "dark" | "system",
      });

      setSaveSuccess(true);
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
      let hostname = newSite;

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
      const preset = SMART_TRANSLATION_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setSmartTranslationConfig(preset.config);
      }
    }
  };

  // Handle custom smart translation config changes
  const handleSmartTranslationConfigChange = (
    field: keyof SmartTranslationConfig,
    value: string
  ) => {
    setSmartTranslationConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Get permission status UI elements
  const getPermissionStatusUI = () => {
    if (micPermission === "checking") {
      return (
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse mr-2"></div>
          <span className="text-sm text-muted-foreground">
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
          <span className="text-sm text-muted-foreground">
            Microphone permission not yet requested
          </span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/public/48.png"
              alt="AI Translator Pro"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-bold">AI Translator Pro</h1>
              <p className="text-muted-foreground">
                Configure your API keys and customize translation options.
              </p>
            </div>
          </div>
          <ThemeToggleWithLabel />
        </div>
      </header>

      <div className="grid gap-6">
        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Set up your OpenAI API key to access AI features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="openaiApi"
                className="text-sm font-medium mb-2 block"
              >
                OpenAI API Key
              </label>
              <Input
                id="openaiApi"
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>{" "}
                (for translation and speech-to-text)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Microphone Permission Section */}
        <Card>
          <CardHeader>
            <CardTitle>Microphone Access</CardTitle>
            <CardDescription>
              Grant microphone access to use voice-to-text features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>{getPermissionStatusUI()}</div>

            <div className="flex space-x-2">
              {micPermission !== "granted" && (
                <Button
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
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Recording in progress... Speak now to test your microphone.
                    You'll hear your recording after 3 seconds.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Translation Options */}
        <Card>
          <CardHeader>
            <CardTitle>Translation Settings</CardTitle>
            <CardDescription>
              Configure how translations are handled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Smart Translation</label>
                <p className="text-xs text-muted-foreground">
                  Auto-detect and translate between your configured languages
                </p>
              </div>
              <Switch
                checked={smartTranslation}
                onCheckedChange={setSmartTranslation}
              />
            </div>

            {!smartTranslation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Default Source Language
                  </label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                  >
                    <SelectTrigger>
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

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Default Target Language
                  </label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger>
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

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Automatic Translation
                </label>
                <p className="text-xs text-muted-foreground">
                  Automatically translate selected text
                </p>
              </div>
              <Switch
                checked={isAutoTranslate}
                onCheckedChange={setIsAutoTranslate}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Enable Animations</label>
                <p className="text-xs text-muted-foreground">
                  Enable UI animations for better experience
                </p>
              </div>
              <Switch
                checked={enableAnimations}
                onCheckedChange={setEnableAnimations}
              />
            </div>
          </CardContent>
        </Card>

        {/* Smart Translation Configuration */}
        {smartTranslation && (
          <Card>
            <CardHeader>
              <CardTitle>Smart Translation Configuration</CardTitle>
              <CardDescription>
                Configure which languages your smart translation should handle
                automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Choose a Preset or Custom Configuration
                </label>

                <div className="grid gap-3 mb-4">
                  {SMART_TRANSLATION_PRESETS.map((preset) => (
                    <label
                      key={preset.id}
                      className="flex items-start p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="smartTranslationPreset"
                        value={preset.id}
                        checked={selectedPreset === preset.id}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {preset.description}
                        </div>
                      </div>
                    </label>
                  ))}

                  <label className="flex items-start p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <input
                      type="radio"
                      name="smartTranslationPreset"
                      value="custom"
                      checked={selectedPreset === "custom"}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Custom Configuration</div>
                      <div className="text-sm text-muted-foreground">
                        Configure your own language pair
                      </div>
                    </div>
                  </label>
                </div>

                {customSmartTranslation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-muted rounded-lg border"
                  >
                    <h3 className="font-medium mb-3">
                      Custom Language Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Primary Language
                        </label>
                        <Select
                          value={smartTranslationConfig.primaryLanguage}
                          onValueChange={(value) =>
                            handleSmartTranslationConfigChange(
                              "primaryLanguage",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.filter(
                              (lang) => lang.code !== "auto"
                            ).map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your main working language
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Secondary Language
                        </label>
                        <Select
                          value={smartTranslationConfig.secondaryLanguage}
                          onValueChange={(value) =>
                            handleSmartTranslationConfigChange(
                              "secondaryLanguage",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.filter(
                              (lang) => lang.code !== "auto"
                            ).map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Language to translate to/from
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Fallback Language
                        </label>
                        <Select
                          value={smartTranslationConfig.fallbackLanguage}
                          onValueChange={(value) =>
                            handleSmartTranslationConfigChange(
                              "fallbackLanguage",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.filter(
                              (lang) => lang.code !== "auto"
                            ).map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          For unrecognized languages
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-background rounded border">
                      <p className="text-sm">
                        <strong>How it works:</strong> Text in your primary
                        language gets translated to your secondary language, and
                        vice versa. Any other language gets translated to your
                        fallback language.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disabled Sites */}
        <Card>
          <CardHeader>
            <CardTitle>Disabled Websites</CardTitle>
            <CardDescription>
              The extension will not work on these websites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="example.com"
                className="flex-1"
              />
              <Button onClick={addDisabledSite} disabled={!newSite}>
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {disabledSites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No disabled websites
                </p>
              ) : (
                disabledSites.map((site) => (
                  <div
                    key={site}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{site}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDisabledSite(site)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      title="Remove website"
                    >
                      ×
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end items-center gap-4">
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-destructive text-sm"
          >
            {error}
          </motion.p>
        )}

        {saveSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600 text-sm"
          >
            Settings saved successfully!
          </motion.p>
        )}

        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

const Options = () => {
  return (
    <ThemeProvider>
      <OptionsContent />
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Options />);

export default Options;
