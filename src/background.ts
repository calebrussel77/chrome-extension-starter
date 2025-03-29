import { translateText } from "./services/api";
import {
  getConfig,
  isSiteDisabled,
  toggleSiteDisabled,
  updateConfig,
} from "./services/storage";
import {
  GetSiteStatusMessage,
  MessageType,
  ToggleSiteDisabledMessage,
  TranslateSelectionMessage,
  UpdateConfigMessage,
} from "./types";

// Initialize the extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Translator Pro installed or updated");

  // Create context menu items
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Traduire la sélection",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "toggleSiteDisabled",
    title: "Désactiver/Activer sur ce site",
    contexts: ["all"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "translateSelection" && info.selectionText) {
    const config = await getConfig();

    // Check if site is disabled
    if (tab.url) {
      const isDisabled = await isSiteDisabled(tab.url);
      if (isDisabled) {
        console.log("Translation disabled for this site");
        return;
      }
    }

    try {
      const result = await translateText(
        info.selectionText,
        config.sourceLanguage,
        config.targetLanguage,
        config.apiKey
      );

      // Send translation result to content script
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_TRANSLATION",
        translation: result.translatedText,
        originalText: info.selectionText,
      });
    } catch (error) {
      console.error("Translation error:", error);

      // Send error to content script
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (info.menuItemId === "toggleSiteDisabled" && tab.url) {
    const newStatus = await toggleSiteDisabled(tab.url);

    // Notify content script about the status change
    chrome.tabs.sendMessage(tab.id, {
      type: "SITE_STATUS_CHANGED",
      isDisabled: newStatus,
    });
  }
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  (async () => {
    try {
      if (message.type === MessageType.TRANSLATE_SELECTION) {
        const { text, sourceLanguage, targetLanguage } =
          message as TranslateSelectionMessage;
        const config = await getConfig();

        const result = await translateText(
          text,
          sourceLanguage,
          targetLanguage,
          config.apiKey
        );

        sendResponse(result);
      } else if (message.type === MessageType.TOGGLE_SITE_DISABLED) {
        const { site } = message as ToggleSiteDisabledMessage;
        const newStatus = await toggleSiteDisabled(site);
        sendResponse({ isDisabled: newStatus });
      } else if (message.type === MessageType.GET_SITE_STATUS) {
        const { site } = message as GetSiteStatusMessage;
        const isDisabled = await isSiteDisabled(site);
        sendResponse({ isDisabled });
      } else if (message.type === MessageType.UPDATE_CONFIG) {
        const { config } = message as UpdateConfigMessage;
        await updateConfig(config);
        sendResponse({ success: true });
      } else if (message.type === MessageType.GET_CONFIG) {
        const config = await getConfig();
        sendResponse(config);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })();

  // Return true to indicate we'll respond asynchronously
  return true;
});
