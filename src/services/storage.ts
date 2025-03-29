import { DEFAULT_CONFIG } from "../languages";
import { ExtensionConfig, HistoryItem } from "../types";

/**
 * Gets the extension configuration from Chrome storage
 * @returns A promise that resolves to the extension configuration
 */
export const getConfig = async (): Promise<ExtensionConfig> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["extensionConfig"], (result) => {
      const config = result.extensionConfig ?? {
        ...DEFAULT_CONFIG,
        history: [],
      };
      if (!config.history) config.history = [];
      resolve(config);
    });
  });
};

/**
 * Updates the extension configuration in Chrome storage
 * @param config The partial configuration to update
 * @returns A promise that resolves when the update is complete
 */
export const updateConfig = async (
  config: Partial<ExtensionConfig>
): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["extensionConfig"], (result) => {
      const currentConfig = result.extensionConfig ?? {
        ...DEFAULT_CONFIG,
        history: [],
      };
      if (!currentConfig.history) currentConfig.history = [];
      const newConfig = { ...currentConfig, ...config };

      chrome.storage.sync.set({ extensionConfig: newConfig }, () => {
        resolve();
      });
    });
  });
};

/**
 * Adds an item to the history
 * @param item The history item to add
 * @returns A promise that resolves when the item is added
 */
export const addToHistory = async (
  item: Omit<HistoryItem, "id" | "timestamp">
): Promise<void> => {
  const config = await getConfig();
  const history = config.history || [];

  const newItem: HistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
  };

  // Limit history to 100 items to avoid storage issues
  const newHistory = [newItem, ...history].slice(0, 100);

  await updateConfig({ history: newHistory });
};

/**
 * Gets the history items
 * @returns A promise that resolves to the history items
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
  const config = await getConfig();
  return config.history || [];
};

/**
 * Clears the history
 * @returns A promise that resolves when the history is cleared
 */
export const clearHistory = async (): Promise<void> => {
  await updateConfig({ history: [] });
};

/**
 * Deletes a history item
 * @param id The ID of the history item to delete
 * @returns A promise that resolves when the item is deleted
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  const config = await getConfig();
  const history = config.history || [];

  const newHistory = history.filter((item) => item.id !== id);

  await updateConfig({ history: newHistory });
};

/**
 * Checks if a site is in the disabled list
 * @param site The site URL to check
 * @returns A promise that resolves to a boolean indicating if the site is disabled
 */
export const isSiteDisabled = async (site: string): Promise<boolean> => {
  const config = await getConfig();
  const hostname = new URL(site).hostname;
  return config.disabledSites.includes(hostname);
};

/**
 * Toggles a site's disabled status
 * @param site The site URL to toggle
 * @returns A promise that resolves to a boolean indicating the new disabled status
 */
export const toggleSiteDisabled = async (site: string): Promise<boolean> => {
  const config = await getConfig();
  const hostname = new URL(site).hostname;

  const isCurrentlyDisabled = config.disabledSites.includes(hostname);
  let newDisabledSites: string[];

  if (isCurrentlyDisabled) {
    newDisabledSites = config.disabledSites.filter((s) => s !== hostname);
  } else {
    newDisabledSites = [...config.disabledSites, hostname];
  }

  await updateConfig({ disabledSites: newDisabledSites });
  return !isCurrentlyDisabled;
};
