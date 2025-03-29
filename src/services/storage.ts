import { DEFAULT_CONFIG } from "../languages";
import { ExtensionConfig } from "../types";

/**
 * Gets the extension configuration from Chrome storage
 * @returns A promise that resolves to the extension configuration
 */
export const getConfig = async (): Promise<ExtensionConfig> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["extensionConfig"], (result) => {
      const config = result.extensionConfig ?? DEFAULT_CONFIG;
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
      const currentConfig = result.extensionConfig ?? DEFAULT_CONFIG;
      const newConfig = { ...currentConfig, ...config };

      chrome.storage.sync.set({ extensionConfig: newConfig }, () => {
        resolve();
      });
    });
  });
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
