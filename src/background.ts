import { translateText } from "./services/api";
import {
  addToHistory,
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

// Keep track of tabs with content scripts loaded
const contentScriptTabs = new Set<number>();

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

// When a tab is updated, check if it's a content script tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    // The tab has completed loading, check if the content script is loaded
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
        // If there's no error, the content script is loaded
        if (!chrome.runtime.lastError && response) {
          contentScriptTabs.add(tabId);
          console.log(`Content script loaded in tab ${tabId}`);
        } else {
          // If there's an error, the content script might not be loaded
          console.log(
            `Content script not loaded in tab ${tabId} or error: ${chrome.runtime.lastError?.message}`
          );
        }
      });
    }, 1000); // Give it a second to load
  }
});

// When a tab is closed, remove it from our list
chrome.tabs.onRemoved.addListener((tabId) => {
  contentScriptTabs.delete(tabId);
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
      // Check if the content script is loaded
      const isContentScriptLoaded = await isTabContentScriptLoaded(tab.id);
      if (!isContentScriptLoaded) {
        console.log(`Content script not loaded in tab ${tab.id}, injecting...`);
        await injectContentScript(tab.id);
      }

      const result = await translateText(
        info.selectionText,
        config.sourceLanguage,
        config.targetLanguage,
        config.apiKey
      );

      // Add to history
      await addToHistory({
        type: "translation",
        originalText: info.selectionText,
        translatedText: result.translatedText ?? "",
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      });

      // Send translation result to content script
      await sendMessageToTab(tab.id, {
        type: "SHOW_TRANSLATION",
        translation: result.translatedText,
        originalText: info.selectionText,
        error: result.error,
      });
    } catch (error) {
      console.error("Translation error:", error);

      // Send error to content script
      try {
        await sendMessageToTab(tab.id, {
          type: "SHOW_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (err) {
        console.error("Error sending error message to content script:", err);
      }
    }
  } else if (info.menuItemId === "toggleSiteDisabled" && tab.url) {
    const newStatus = await toggleSiteDisabled(tab.url);

    // Notify content script about the status change
    try {
      await sendMessageToTab(tab.id, {
        type: "SITE_STATUS_CHANGED",
        isDisabled: newStatus,
      });
    } catch (error) {
      console.error(
        "Error sending site status message to content script:",
        error
      );
    }
  }
});

// Send a message to a tab, with retries
const sendMessageToTab = async (
  tabId: number,
  message: unknown,
  maxRetries = 3
) => {
  return new Promise((resolve, reject) => {
    const attemptSend = (retryCount: number) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            `Error sending message (attempt ${retryCount + 1}):`,
            chrome.runtime.lastError
          );
          if (retryCount < maxRetries) {
            // Wait a bit and retry
            setTimeout(() => attemptSend(retryCount + 1), 500);
          } else {
            reject(
              new Error(
                `Failed to send message after ${maxRetries} attempts: ${chrome.runtime.lastError.message}`
              )
            );
          }
        } else {
          resolve(response);
        }
      });
    };

    attemptSend(0);
  });
};

// Check if a tab has the content script loaded
const isTabContentScriptLoaded = async (tabId: number): Promise<boolean> => {
  try {
    await sendMessageToTab(tabId, { type: "PING" }, 1);
    contentScriptTabs.add(tabId);
    return true;
  } catch (error) {
    console.error("Error checking if tab has content script loaded:", error);
    return false;
  }
};

// Inject the content script into a tab
const injectContentScript = async (tabId: number): Promise<void> => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    contentScriptTabs.add(tabId);
  } catch (error) {
    console.error("Error injecting content script:", error);
    throw error;
  }
};

// Fonction pour capturer l'audio d'un onglet
const captureTabAudio = async () => {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!stream) {
        reject(new Error("Failed to capture tab audio"));
        return;
      }

      resolve(stream);
    });
  });
};

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      // If the message is from a content script, mark the tab as having a content script
      if (sender.tab?.id) {
        contentScriptTabs.add(sender.tab.id);
      }

      if (message.type === "CONTENT_SCRIPT_READY") {
        console.log("Content script is ready in tab", sender.tab?.id);
        sendResponse({ status: "Background script acknowledged" });
        return;
      } else if (message.type === "PING") {
        sendResponse({ status: "Background script is active" });
        return;
      } else if (message.type === MessageType.TRANSLATE_SELECTION) {
        const { text, sourceLanguage, targetLanguage } =
          message as TranslateSelectionMessage;
        const config = await getConfig();

        const result = await translateText(
          text,
          sourceLanguage,
          targetLanguage,
          config.apiKey
        );

        // Add to history
        await addToHistory({
          type: "translation",
          originalText: text,
          translatedText: result.translatedText ?? "",
          sourceLanguage,
          targetLanguage,
        });

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
        // Handle GET_CONFIG message by getting and returning the config
        const config = await getConfig();
        sendResponse(config);
        return;
      } else if (message.type === "CAPTURE_TAB_AUDIO") {
        if (sender.tab?.id) {
          try {
            await captureTabAudio();
            // Nous ne pouvons pas envoyer directement le stream par message,
            // donc nous indiquons simplement le succès
            sendResponse({ success: true });
          } catch (error) {
            console.error("Error capturing tab audio:", error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          sendResponse({ success: false, error: "No tab ID available" });
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })();

  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Exposer chrome.tabCapture.getMediaStreamId une fois injecté dans le popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "microphone-permission") {
    port.onMessage.addListener((msg) => {
      if (msg.type === "GET_TAB_CAPTURE_MEDIA_STREAM_ID") {
        chrome.tabCapture.getMediaStreamId(
          { consumerTabId: msg.tabId },
          (streamId) => {
            port.postMessage({ type: "TAB_CAPTURE_MEDIA_STREAM_ID", streamId });
          }
        );
      }
    });
  }
});
