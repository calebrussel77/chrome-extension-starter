import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Toggle from "../../components/Toggle";
import { LANGUAGES } from "../../languages";
import { getConfig, updateConfig } from "../../services/storage";

import "../../chrome-extension/global.css";

const Options = () => {
  // State
  const [apiKey, setApiKey] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [disabledSites, setDisabledSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

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
        setDisabledSites(config.disabledSites);
      } catch (err) {
        console.error("Error loading config:", err);
        setError("Failed to load settings");
      }
    };

    loadConfig();
  }, []);

  // Save config
  const saveConfig = async () => {
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      await updateConfig({
        apiKey,
        sourceLanguage,
        targetLanguage,
        autoTranslate: isAutoTranslate,
        enableAnimations,
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
            label="OpenAI API Key"
            value={apiKey}
            onChange={setApiKey}
            fullWidth
            type="password"
            placeholder="Enter your API key..."
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
            </a>
          </p>
        </div>
      </section>

      {/* Translation Options */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4">Translation Options</h2>

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
      <div className="flex items-end gap-4">
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
