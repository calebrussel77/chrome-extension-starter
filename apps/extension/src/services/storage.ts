import { DEFAULT_CONFIG } from "../languages";
import { ExtensionConfig, HistoryItem } from "../types";

/**
 * Gets the extension configuration from Chrome storage
 * @returns A promise that resolves to the extension configuration
 */
export const getConfig = async (): Promise<ExtensionConfig> => {
  return new Promise((resolve) => {
    // Get main config from sync storage (without history)
    chrome.storage.sync.get(["extensionConfig"], (result) => {
      const config = result.extensionConfig ?? {
        ...DEFAULT_CONFIG,
        history: [],
      };
      
      // Get history separately from local storage
      getHistory().then((history) => {
        config.history = history;
        resolve(config);
      });
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
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["extensionConfig"], async (result) => {
      const currentConfig = result.extensionConfig ?? {
        ...DEFAULT_CONFIG,
        history: [],
      };

      // Separate history from other config updates
      const { history, ...configWithoutHistory } = config;
      const newConfig = { ...currentConfig, ...configWithoutHistory };
      
      // Remove history from sync storage to save space
      delete newConfig.history;

      try {
        // Update main config in sync storage
        await new Promise<void>((resolveSync, rejectSync) => {
          chrome.storage.sync.set({ extensionConfig: newConfig }, () => {
            if (chrome.runtime.lastError) {
              rejectSync(new Error(chrome.runtime.lastError.message));
            } else {
              resolveSync();
            }
          });
        });

        // Update history separately if provided
        if (history !== undefined) {
          await saveHistoryToLocal(history);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Saves history directly to local storage
 * @param history The history array to save
 * @returns A promise that resolves when the history is saved
 */
const saveHistoryToLocal = async (history: HistoryItem[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ extensionHistory: history }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Migrates history from sync storage to local storage (for backward compatibility)
 * @returns A promise that resolves when migration is complete
 */
const migrateHistoryFromSync = async (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["extensionConfig"], async (result) => {
      const config = result.extensionConfig;
      
      // If there's history in sync storage, migrate it to local storage
      if (config && config.history && config.history.length > 0) {
        try {
          await saveHistoryToLocal(config.history);
          
          // Remove history from sync storage to free up space
          const configWithoutHistory = { ...config };
          delete configWithoutHistory.history;
          
          await new Promise<void>((resolveSync) => {
            chrome.storage.sync.set({ extensionConfig: configWithoutHistory }, () => {
              resolveSync();
            });
          });
        } catch (error) {
          console.warn('Failed to migrate history:', error);
        }
      }
      resolve();
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
  try {
    const history = await getHistory();

    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add new item to the beginning of the history array
    // Removed the arbitrary 100-item limit to allow unlimited history
    const newHistory = [newItem, ...history];

    await saveHistoryToLocal(newHistory);
    
    // Optional cleanup for extremely large histories (runs in background)
    cleanupHistoryIfNeeded().catch(err => 
      console.warn('History cleanup failed:', err)
    );
  } catch (error) {
    console.error('Failed to add item to history:', error);
    throw error;
  }
};

/**
 * Gets the history items
 * @returns A promise that resolves to the history items
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
  return new Promise((resolve) => {
    // First try to get history from local storage
    chrome.storage.local.get(["extensionHistory"], (result) => {
      if (result.extensionHistory && Array.isArray(result.extensionHistory)) {
        resolve(result.extensionHistory);
      } else {
        // If no history in local storage, check if we need to migrate from sync storage
        migrateHistoryFromSync().then(() => {
          // Try again after migration
          chrome.storage.local.get(["extensionHistory"], (result) => {
            resolve(result.extensionHistory || []);
          });
        });
      }
    });
  });
};

/**
 * Clears the history
 * @returns A promise that resolves when the history is cleared
 */
export const clearHistory = async (): Promise<void> => {
  await saveHistoryToLocal([]);
};

/**
 * Deletes a history item
 * @param id The ID of the history item to delete
 * @returns A promise that resolves when the item is deleted
 */
export const deleteHistoryItem = async (id: string): Promise<void> => {
  const history = await getHistory();
  const newHistory = history.filter((item) => item.id !== id);
  await saveHistoryToLocal(newHistory);
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

// Add function to save microphone permission status
export const setMicrophonePermission = async (
  granted: boolean
): Promise<void> => {
  await chrome.storage.local.set({ microphonePermission: granted });
};

// Add function to get microphone permission status
export const getMicrophonePermission = async (): Promise<boolean> => {
  const result = await chrome.storage.local.get(["microphonePermission"]);
  return result.microphonePermission === true;
};

/**
 * Gets history storage statistics
 * @returns A promise that resolves to storage statistics
 */
export const getHistoryStats = async (): Promise<{ count: number; sizeBytes: number }> => {
  const history = await getHistory();
  const historyJson = JSON.stringify(history);
  return {
    count: history.length,
    sizeBytes: new Blob([historyJson]).size
  };
};

/**
 * Adds cleanup for very large history (optional safety measure)
 * Only keeps the most recent 10,000 items if history grows too large
 * @returns A promise that resolves when cleanup is complete
 */
export const cleanupHistoryIfNeeded = async (): Promise<void> => {
  const MAX_HISTORY_ITEMS = 10000; // Reasonable limit to prevent excessive memory usage
  const history = await getHistory();
  
  if (history.length > MAX_HISTORY_ITEMS) {
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    await saveHistoryToLocal(trimmedHistory);
    console.info(`History cleanup: trimmed from ${history.length} to ${MAX_HISTORY_ITEMS} items`);
  }
};
