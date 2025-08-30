# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Translator Pro is a Chrome Extension that provides AI-powered translation using Google Gemini AI. The extension features text translation, voice-to-text capabilities, and site-specific controls.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start development server (opens popup-local.html for testing)
pnpm run dev

# Build the extension for production (outputs to dist/)
pnpm run build

# Run linting
pnpm run lint

# Preview built extension
pnpm run preview
```

## Architecture

### Extension Structure
The extension follows Chrome Manifest V3 architecture with three main components:

1. **Background Script** (`src/background.ts`): Service worker that handles:
   - Context menu operations
   - Message routing between components
   - Content script injection and management
   - Tab tracking for loaded content scripts
   - Translation API calls coordination

2. **Content Script** (`src/content.ts`): Injected into web pages to:
   - Display translation popups
   - Handle text selection events
   - Communicate with background script for translations
   - Manage site-specific enable/disable states

3. **Extension UI** (Popup and Options):
   - **Popup** (`src/chrome-extension/popup/index.tsx`): Main user interface for quick access
   - **Options** (`src/chrome-extension/options/index.tsx`): Settings management page
   - Both built as React applications with Tailwind CSS

### Build System
- **Vite** handles the build process with multiple entry points:
  - `popup.html` → Extension popup UI
  - `options.html` → Extension options page  
  - `background.ts` → Background service worker
  - `content.ts` → Content script for web pages
- Static assets (icons, manifest) are copied via `vite-plugin-static-copy`
- TypeScript compilation uses two configs: `tsconfig.app.json` for source, `tsconfig.node.json` for build tools

### API Integration
- **Translation**: Google Gemini AI (via `@google/genai` SDK)
  - Model: `gemini-2.5-flash-preview-05-20`
  - Supports auto-detection and 30+ languages
- **Speech-to-Text**: OpenAI Whisper API (via `openai` SDK)
  - Model: `whisper-1`
  - Converts audio blobs to text

### Storage Architecture
The extension uses Chrome Storage API (`src/services/storage.ts`) to manage:
- User configuration (API keys, language preferences)
- Translation history
- Site-specific enable/disable states
- All data stored locally in Chrome's secure storage

### Message Passing Protocol
Communication between components uses typed messages (`src/types.ts`):
- `TRANSLATE_SELECTION`: Request translation from content script
- `CONFIG_UPDATED`: Notify content scripts of configuration changes
- `SITE_STATUS_CHANGED`: Update site enable/disable state
- `PING`: Check if content script is loaded
- Background script maintains `contentScriptTabs` Set to track loaded scripts

## TypeScript Configuration

- Strict mode enabled with all strict checks
- Target: ES2020 with DOM libraries
- Module resolution: bundler mode for Vite compatibility
- JSX: react-jsx transform
- No emit (Vite handles compilation)

## Extension Permissions

The manifest declares these permissions:
- `storage`: Store user preferences and history
- `contextMenus`: Add right-click translation options
- `activeTab`: Access current tab for translations
- `scripting`: Inject content scripts dynamically
- `<all_urls>`: Required for content script injection on any site

## Key Implementation Details

- Content scripts are dynamically injected only when needed to minimize performance impact
- Background script implements retry logic for message passing to handle timing issues
- Translation requests show loading state before API response
- Site-specific controls allow users to disable extension per domain
- All API keys stored securely in Chrome local storage, never transmitted except to respective APIs