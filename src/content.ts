// Import the type at the top of the file
import { ExtensionConfig } from "./types";

// State management
let isTranslating = false;
let isExtensionDisabled = false;
let selectedText = "";
let translationPopup: HTMLDivElement | null = null;
let config: ExtensionConfig | null = null; // Store the config

// Function to inject the microphone permission iframe
const injectMicrophonePermissionIframe = async () => {
  // Inject iframe only if permission is not yet granted
  const iframe = document.createElement("iframe");
  iframe.setAttribute("hidden", "hidden");
  iframe.setAttribute("id", "permissionsIFrame");
  iframe.setAttribute("allow", "microphone");
  iframe.src = chrome.runtime.getURL("src/pages/permission/index.html");
  document.body.appendChild(iframe);

  // Listen for messages from the iframe
  window.addEventListener("message", (event) => {
    if (event.data.type === "MICROPHONE_PERMISSION_GRANTED") {
      // Remove the iframe once permission is granted
      iframe.remove();
    }
  });
};

// Initialize the content script
const init = async () => {
  try {
    // Inject microphone permission iframe
    await injectMicrophonePermissionIframe();

    // Send a message to the background script to check if it's running
    const checkConnection = async () => {
      try {
        await chrome.runtime.sendMessage({ type: "PING" });
      } catch (error) {
        console.warn(
          "Could not establish connection to extension background script:",
          error
        );
      }
    };

    // Check background connection
    await checkConnection();

    // Get config and store it
    chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Error getting config:", chrome.runtime.lastError);
        return;
      }

      if (response) {
        config = response;
      } else {
        console.warn("No config response received from background script");
      }
    });

    // Listen for text selection events
    document.addEventListener("mouseup", handleTextSelection);

    // Listen for messages from the popup and background script
    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
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
      } else if (message.type === "SHOW_LOADING") {
        selectedText = message.originalText;
        isTranslating = true;
        showLoadingPopup();
        sendResponse({ success: true });
      } else if (message.type === "CONFIG_UPDATED") {
        // Update config when it changes
        config = message.config;
        sendResponse({ success: true });
      }

      return true; // Keep the message channel open for async responses
    });
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

    // Check if we have config and auto-translate is enabled
    if (config && config.autoTranslate && config.googleApiKey) {
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
            if (chrome.runtime.lastError) {
              console.warn(
                "Error sending translate request:",
                chrome.runtime.lastError
              );
              showError(
                "Failed to communicate with the extension. Please try again."
              );
              isTranslating = false;
              return;
            }

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
    } else if (!config) {
      // If config is not loaded yet, try to get it again
      chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Error getting config:", chrome.runtime.lastError);
          return;
        }

        if (response) {
          config = response;
          // Retry the translation with the new config
          handleTextSelection();
        }
      });
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
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
    padding: "16px",
    minWidth: "300px",
    maxWidth: "380px",
    minHeight: "150px",
    maxHeight: "350px",
    overflowY: "auto",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#333",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    backdropFilter: "blur(10px)",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
  closeButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "12px",
    right: "12px",
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "4px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease, color 0.2s ease",
  });

  closeButton.addEventListener("mouseover", () => {
    closeButton.style.backgroundColor = "#f3f4f6";
    closeButton.style.color = "#4b5563";
  });

  closeButton.addEventListener("mouseout", () => {
    closeButton.style.backgroundColor = "transparent";
    closeButton.style.color = "#9ca3af";
  });

  closeButton.addEventListener("click", () => {
    if (translationPopup) {
      translationPopup.style.opacity = "0";
      translationPopup.style.transform = "translateY(10px)";
      setTimeout(() => {
        if (translationPopup) {
          translationPopup.remove();
          translationPopup = null;
        }
      }, 300);
    }
  });

  translationPopup.appendChild(closeButton);

  return translationPopup;
};

// Add styles to document
const addStyles = () => {
  if (!document.getElementById("ai-translator-styles")) {
    const style = document.createElement("style");
    style.id = "ai-translator-styles";
    style.textContent = `
      @keyframes ai-translator-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes ai-translator-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      
      .ai-translator-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: ai-translator-skeleton 1.5s ease-in-out infinite;
        border-radius: 4px;
        height: 16px;
        margin-bottom: 8px;
      }
      
      @keyframes ai-translator-skeleton {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      .ai-translator-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-weight: 500;
        font-size: 12px;
        padding: 6px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .ai-translator-btn-primary {
        background-color: #4f46e5;
        color: white;
      }
      
      .ai-translator-btn-primary:hover {
        background-color: #4338ca;
      }
      
      .ai-translator-btn-secondary {
        background-color: #f3f4f6;
        color: #4b5563;
      }
      
      .ai-translator-btn-secondary:hover {
        background-color: #e5e7eb;
      }

      .ai-translator-popup {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }
};

// Show loading popup with skeleton loader
const showLoadingPopup = () => {
  addStyles();
  const popup = createOrUpdatePopup();

  // Create loading container
  const loadingContainer = document.createElement("div");
  loadingContainer.style.padding = "8px 4px";
  loadingContainer.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Create logo and title
  const headerDiv = document.createElement("div");
  headerDiv.style.display = "flex";
  headerDiv.style.alignItems = "center";
  headerDiv.style.marginBottom = "16px";

  const logoDiv = document.createElement("div");
  const logoImg = document.createElement("img");
  logoImg.src = chrome.runtime.getURL("public/32.png");
  logoImg.width = 20;
  logoImg.height = 20;
  logoDiv.appendChild(logoImg);

  const titleDiv = document.createElement("div");
  titleDiv.textContent = "AI Translator Pro";
  titleDiv.style.marginLeft = "8px";
  titleDiv.style.fontWeight = "600";
  titleDiv.style.color = "#4f46e5";
  titleDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  headerDiv.appendChild(logoDiv);
  headerDiv.appendChild(titleDiv);
  loadingContainer.appendChild(headerDiv);

  // Create skeleton loaders
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "ai-translator-skeleton";
    skeleton.style.width = i === 0 ? "100%" : `${70 - i * 15}%`;
    loadingContainer.appendChild(skeleton);
  }

  // Add loading text
  const loadingText = document.createElement("div");
  loadingText.textContent = "Translation in progress...";
  loadingText.style.fontSize = "13px";
  loadingText.style.color = "#6b7280";
  loadingText.style.marginTop = "12px";
  loadingText.style.display = "flex";
  loadingText.style.alignItems = "center";
  loadingText.style.justifyContent = "center";
  loadingText.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Add spinner
  const spinner = document.createElement("div");
  spinner.style.width = "14px";
  spinner.style.height = "14px";
  spinner.style.borderRadius = "50%";
  spinner.style.border = "2px solid #e5e7eb";
  spinner.style.borderTopColor = "#4f46e5";
  spinner.style.animation = "ai-translator-spin 0.8s linear infinite";
  spinner.style.marginRight = "8px";

  loadingText.prepend(spinner);
  loadingContainer.appendChild(loadingText);

  // Clear popup and add content
  while (popup.firstChild) {
    if (popup.lastChild !== popup.querySelector("button")) {
      popup.removeChild(popup.firstChild);
    } else {
      break;
    }
  }

  popup.insertBefore(loadingContainer, popup.firstChild);

  // Animate entry
  popup.style.opacity = "0";
  popup.style.transform = "translateY(10px)";

  // Force reflow
  void popup.offsetHeight;

  // Apply final styles
  popup.style.opacity = "1";
  popup.style.transform = "translateY(0)";
};

// Show translation result
const showTranslation = (translatedText: string, originalText: string) => {
  isTranslating = false;
  addStyles();
  const popup = createOrUpdatePopup();

  // Create content container
  const content = document.createElement("div");
  content.style.padding = "8px 4px";

  // Create logo and title
  const headerDiv = document.createElement("div");
  headerDiv.style.display = "flex";
  headerDiv.style.alignItems = "center";
  headerDiv.style.marginBottom = "16px";

  const logoDiv = document.createElement("div");
  const logoImg = document.createElement("img");
  logoImg.src = chrome.runtime.getURL("public/32.png");
  logoImg.width = 20;
  logoImg.height = 20;
  logoDiv.appendChild(logoImg);

  const titleDiv = document.createElement("div");
  titleDiv.textContent = "AI Translator Pro";
  titleDiv.style.marginLeft = "8px";
  titleDiv.style.fontWeight = "600";
  titleDiv.style.color = "#4f46e5";
  titleDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  headerDiv.appendChild(logoDiv);
  headerDiv.appendChild(titleDiv);
  content.appendChild(headerDiv);

  // Add original text
  const originalDiv = document.createElement("div");
  originalDiv.textContent = originalText;
  originalDiv.style.padding = "10px 12px";
  originalDiv.style.backgroundColor = "#f9fafb";
  originalDiv.style.borderRadius = "8px";
  originalDiv.style.color = "#4b5563";
  originalDiv.style.fontSize = "13px";
  originalDiv.style.marginBottom = "12px";
  originalDiv.style.border = "1px solid #f3f4f6";
  originalDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  content.appendChild(originalDiv);

  // Add translated text
  const translatedDiv = document.createElement("div");
  translatedDiv.textContent = translatedText;
  translatedDiv.style.padding = "12px 14px";
  translatedDiv.style.backgroundColor = "#f0f9ff";
  translatedDiv.style.borderRadius = "8px";
  translatedDiv.style.color = "#0c4a6e";
  translatedDiv.style.fontSize = "14px";
  translatedDiv.style.fontWeight = "500";
  translatedDiv.style.border = "1px solid #e0f2fe";
  translatedDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  content.appendChild(translatedDiv);

  // Add action buttons
  const actionsDiv = document.createElement("div");
  actionsDiv.style.display = "flex";
  actionsDiv.style.justifyContent = "flex-end";
  actionsDiv.style.marginTop = "16px";
  actionsDiv.style.gap = "8px";

  // Copy button
  const copyButton = document.createElement("button");
  copyButton.className = "ai-translator-btn ai-translator-btn-primary";
  copyButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
    Copy
  `;

  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(translatedText).then(() => {
      copyButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M20 6L9 17l-5-5"></path></svg>
        Copied!
      `;
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy
        `;
      }, 2000);
    });
  });

  // Listen button
  const listenButton = document.createElement("button");
  listenButton.className = "ai-translator-btn ai-translator-btn-secondary";
  listenButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
    Listen
  `;

  listenButton.addEventListener("click", () => {
    const utterance = new SpeechSynthesisUtterance(translatedText);
    window.speechSynthesis.speak(utterance);
  });

  actionsDiv.appendChild(listenButton);
  actionsDiv.appendChild(copyButton);
  content.appendChild(actionsDiv);

  // Clear popup and add content
  while (popup.firstChild) {
    if (popup.lastChild !== popup.querySelector("button")) {
      popup.removeChild(popup.firstChild);
    } else {
      break;
    }
  }

  popup.insertBefore(content, popup.firstChild);

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
  addStyles();
  const popup = createOrUpdatePopup();

  // Create error content
  const errorDiv = document.createElement("div");
  errorDiv.style.padding = "8px 4px";
  errorDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Create logo and title
  const headerDiv = document.createElement("div");
  headerDiv.style.display = "flex";
  headerDiv.style.alignItems = "center";
  headerDiv.style.marginBottom = "16px";

  const logoDiv = document.createElement("div");
  const logoImg = document.createElement("img");
  logoImg.src = chrome.runtime.getURL("public/32.png");
  logoImg.width = 20;
  logoImg.height = 20;
  logoDiv.appendChild(logoImg);

  const titleDiv = document.createElement("div");
  titleDiv.textContent = "AI Translator Pro";
  titleDiv.style.marginLeft = "8px";
  titleDiv.style.fontWeight = "600";
  titleDiv.style.color = "#4f46e5";
  titleDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  headerDiv.appendChild(logoDiv);
  headerDiv.appendChild(titleDiv);
  errorDiv.appendChild(headerDiv);

  // Create error alert
  const alertDiv = document.createElement("div");
  alertDiv.style.display = "flex";
  alertDiv.style.alignItems = "flex-start";
  alertDiv.style.padding = "12px 14px";
  alertDiv.style.backgroundColor = "#fef2f2";
  alertDiv.style.borderRadius = "8px";
  alertDiv.style.border = "1px solid #fee2e2";
  alertDiv.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // Add error icon
  const errorIcon = document.createElement("div");
  errorIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  errorIcon.style.flexShrink = "0";
  errorIcon.style.marginRight = "10px";
  errorIcon.style.marginTop = "2px";

  // Add error message
  const messageContainer = document.createElement("div");

  const errorTitle = document.createElement("div");
  errorTitle.textContent = "Translation Error";
  errorTitle.style.fontWeight = "600";
  errorTitle.style.color = "#b91c1c";
  errorTitle.style.marginBottom = "4px";
  errorTitle.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  const errorText = document.createElement("div");
  errorText.textContent = errorMessage;
  errorText.style.color = "#ef4444";
  errorText.style.fontSize = "13px";
  errorText.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  messageContainer.appendChild(errorTitle);
  messageContainer.appendChild(errorText);

  alertDiv.appendChild(errorIcon);
  alertDiv.appendChild(messageContainer);

  errorDiv.appendChild(alertDiv);

  // Add retry button
  const retryButton = document.createElement("button");
  retryButton.className = "ai-translator-btn ai-translator-btn-primary";
  retryButton.style.marginTop = "16px";
  retryButton.style.width = "100%";
  retryButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7l3 2.7"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7l-3-2.7"></path></svg>
    Retry
  `;

  retryButton.addEventListener("click", () => {
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
    handleTextSelection();
  });

  errorDiv.appendChild(retryButton);

  // Clear popup and add content
  while (popup.firstChild) {
    if (popup.lastChild !== popup.querySelector("button")) {
      popup.removeChild(popup.firstChild);
    } else {
      break;
    }
  }

  popup.insertBefore(errorDiv, popup.firstChild);

  // Animate entry
  popup.style.opacity = "0";
  popup.style.transform = "translateY(10px)";

  // Force reflow
  void popup.offsetHeight;

  // Apply final styles
  popup.style.opacity = "1";
  popup.style.transform = "translateY(0)";
};

// Initialize the content script when the DOM is fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Make sure the content script is initialized even if DOMContentLoaded has already fired
setTimeout(init, 500);

// Export a function to detect if the content script is loaded
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "AI_TRANSLATOR_CHECK") {
    window.postMessage({ type: "AI_TRANSLATOR_RESPONSE", loaded: true }, "*");
  }
});
