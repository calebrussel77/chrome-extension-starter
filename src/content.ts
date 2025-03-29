import { getConfig } from "./services/storage";

// State management
let isTranslating = false;
let isExtensionDisabled = false;
let selectedText = "";
let translationPopup: HTMLDivElement | null = null;

// Initialize the content script
const init = async () => {
  try {
    // Check if the extension is disabled for this site
    const hostname = window.location.hostname;

    // Send a message to the background script to check if it's running
    const checkConnection = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: "PING" });
        console.log("Extension connection established:", response);
      } catch (error) {
        console.warn(
          "Could not establish connection to extension background script:",
          error
        );
      }
    };

    // Check background connection
    await checkConnection();

    // Get config
    chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config) => {
      if (chrome.runtime.lastError) {
        console.warn("Error getting config:", chrome.runtime.lastError);
        return;
      }

      if (config && config.disabledSites) {
        isExtensionDisabled = config.disabledSites.includes(hostname);
      }
    });

    // Listen for text selection events
    document.addEventListener("mouseup", handleTextSelection);

    // Listen for messages from the popup and background script
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
      console.log("Content script received message:", message);

      if (message.type === "SHOW_TRANSLATION") {
        if (message.error) {
          showError(message.error);
        } else {
          showTranslation(message.translation, message.originalText);
        }
        sendResponse({ success: true });
      } else if (message.type === "SHOW_ERROR") {
        showError(message.error);
        sendResponse({ success: true });
      } else if (message.type === "SITE_STATUS_CHANGED") {
        isExtensionDisabled = message.isDisabled;

        if (isExtensionDisabled && translationPopup) {
          translationPopup.remove();
          translationPopup = null;
        }
        sendResponse({ success: true });
      } else if (message.type === "PING") {
        sendResponse({ status: "Content script is active" });
      }

      return true; // Keep the message channel open for async responses
    });

    console.log("AI Translator Pro content script initialized");
  } catch (error) {
    console.error("Error initializing content script:", error);
  }
};

// Handle text selection
const handleTextSelection = async () => {
  if (isExtensionDisabled || isTranslating) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";

  if (text && text !== selectedText) {
    selectedText = text;

    // Check if auto-translate is enabled
    const config = await getConfig();

    if (config.autoTranslate && config.apiKey) {
      isTranslating = true;
      showLoadingPopup();

      try {
        // Send message to background script to translate
        chrome.runtime.sendMessage(
          {
            type: "TRANSLATE_SELECTION",
            text,
            sourceLanguage: config.sourceLanguage,
            targetLanguage: config.targetLanguage,
          },
          (response) => {
            isTranslating = false;

            if (response.error) {
              showError(response.error);
            } else {
              showTranslation(response.translatedText, text);
            }
          }
        );
      } catch (error) {
        isTranslating = false;
        showError(error instanceof Error ? error.message : "Unknown error");
      }
    }
  } else if (!text && translationPopup) {
    // Remove translation popup when selection is cleared
    translationPopup.remove();
    translationPopup = null;
    selectedText = "";
  }
};

// Create or update the translation popup
const createOrUpdatePopup = () => {
  if (translationPopup) {
    // Remove existing popup
    translationPopup.remove();
  }

  // Create new popup
  translationPopup = document.createElement("div");
  translationPopup.className = "ai-translator-popup";

  // Apply styles
  Object.assign(translationPopup.style, {
    position: "absolute",
    zIndex: "9999",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    padding: "12px",
    maxWidth: "300px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#333",
    transition: "opacity 0.2s ease-in-out, transform 0.2s ease-in-out",
  });

  // Position the popup near the selection
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position popup below the selection
    translationPopup.style.left = `${window.scrollX + rect.left}px`;
    translationPopup.style.top = `${window.scrollY + rect.bottom + 10}px`;
  }

  document.body.appendChild(translationPopup);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "#666";

  closeButton.addEventListener("click", () => {
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
  });

  translationPopup.appendChild(closeButton);

  return translationPopup;
};

// Show loading popup
const showLoadingPopup = () => {
  const popup = createOrUpdatePopup();

  // Create loading animation
  const loadingDiv = document.createElement("div");
  loadingDiv.textContent = "Traduction en cours...";
  loadingDiv.style.display = "flex";
  loadingDiv.style.alignItems = "center";
  loadingDiv.style.gap = "10px";

  const spinner = document.createElement("div");
  spinner.className = "ai-translator-spinner";
  Object.assign(spinner.style, {
    width: "16px",
    height: "16px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #3498db",
    borderRadius: "50%",
    animation: "ai-translator-spin 1s linear infinite",
  });

  // Add animation keyframes
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ai-translator-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(document.createTextNode("Traduction en cours..."));

  popup.appendChild(loadingDiv);
};

// Show translation result
const showTranslation = (translatedText: string, originalText: string) => {
  const popup = createOrUpdatePopup();

  // Create content container
  const content = document.createElement("div");

  // Add original text
  const originalDiv = document.createElement("div");
  originalDiv.textContent = originalText;
  originalDiv.style.marginBottom = "8px";
  originalDiv.style.color = "#666";
  originalDiv.style.fontSize = "12px";
  content.appendChild(originalDiv);

  // Add separator
  const separator = document.createElement("div");
  separator.style.height = "1px";
  separator.style.backgroundColor = "#eee";
  separator.style.margin = "8px 0";
  content.appendChild(separator);

  // Add translated text
  const translatedDiv = document.createElement("div");
  translatedDiv.textContent = translatedText;
  translatedDiv.style.fontWeight = "bold";
  content.appendChild(translatedDiv);

  // Add action buttons
  const actionsDiv = document.createElement("div");
  actionsDiv.style.display = "flex";
  actionsDiv.style.justifyContent = "flex-end";
  actionsDiv.style.marginTop = "10px";
  actionsDiv.style.gap = "8px";

  // Copy button
  const copyButton = document.createElement("button");
  copyButton.textContent = "Copier";
  Object.assign(copyButton.style, {
    backgroundColor: "#f5f5f5",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "12px",
  });

  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(translatedText).then(() => {
      copyButton.textContent = "Copié!";
      setTimeout(() => {
        copyButton.textContent = "Copier";
      }, 2000);
    });
  });

  actionsDiv.appendChild(copyButton);
  content.appendChild(actionsDiv);

  // Clear popup and add content
  while (popup.firstChild) {
    popup.removeChild(popup.firstChild);
  }

  popup.appendChild(content);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "#666";

  closeButton.addEventListener("click", () => {
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
  });

  popup.appendChild(closeButton);

  // Animate entry
  popup.style.opacity = "0";
  popup.style.transform = "translateY(10px)";

  // Force reflow
  void popup.offsetHeight;

  // Apply final styles
  popup.style.opacity = "1";
  popup.style.transform = "translateY(0)";
};

// Show error message
const showError = (errorMessage: string) => {
  const popup = createOrUpdatePopup();

  // Create error content
  const errorDiv = document.createElement("div");
  errorDiv.style.color = "#e74c3c";

  const errorTitle = document.createElement("div");
  errorTitle.textContent = "Erreur de traduction";
  errorTitle.style.fontWeight = "bold";
  errorTitle.style.marginBottom = "5px";
  errorDiv.appendChild(errorTitle);

  const errorText = document.createElement("div");
  errorText.textContent = errorMessage;
  errorText.style.fontSize = "12px";
  errorDiv.appendChild(errorText);

  // Clear popup and add content
  while (popup.firstChild) {
    popup.removeChild(popup.firstChild);
  }

  popup.appendChild(errorDiv);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "#666";

  closeButton.addEventListener("click", () => {
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
  });

  popup.appendChild(closeButton);
};

// Initialize the content script
init();
