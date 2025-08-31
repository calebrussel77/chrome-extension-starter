# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

AI Translator Pro is a monorepo containing:
1. **Chrome Extension** (`apps/extension`) - AI-powered translation using Google Gemini AI with text translation, voice-to-text capabilities, and site-specific controls
2. **Web App** (`apps/web`) - Next.js landing page with waitlist signup for users interested in the extension
3. **Shared Packages** (`packages/`) - Common utilities and UI components

## Development Commands

### Monorepo Commands
```bash
# Install all dependencies
pnpm install

# Build all apps
pnpm run build:all

# Run linting across all packages
pnpm run lint
```

### Extension Development
```bash
# Start extension development server
pnpm run dev
# or specifically: pnpm --filter extension dev

# Build the extension for production (outputs to apps/extension/dist/)
pnpm run build
# or specifically: pnpm --filter extension build

# Preview built extension
pnpm run preview
```

### Web App Development
```bash
# Start web app development server
pnpm run dev:web
# or specifically: pnpm --filter web dev

# Build web app for production
pnpm run build:web
# or specifically: pnpm --filter web build

# Start production server
pnpm --filter web start
```

## Architecture

### Monorepo Structure
```
ai-translator-pro/
├── apps/
│   ├── extension/          # Chrome extension
│   └── web/               # Next.js web app
├── packages/
│   ├── ui/                # Shared UI components
│   ├── eslint-config/     # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
└── pnpm-workspace.yaml    # pnpm workspace configuration
```

### Extension Structure
The extension (`apps/extension`) follows Chrome Manifest V3 architecture with three main components:

1. **Background Script** (`apps/extension/src/background.ts`): Service worker that handles:
   - Context menu operations
   - Message routing between components
   - Content script injection and management
   - Tab tracking for loaded content scripts
   - Translation API calls coordination

2. **Content Script** (`apps/extension/src/content.ts`): Injected into web pages to:
   - Display translation popups
   - Handle text selection events
   - Communicate with background script for translations
   - Manage site-specific enable/disable states

3. **Extension UI** (Popup and Options):
   - **Popup** (`apps/extension/src/chrome-extension/popup/index.tsx`): Main user interface for quick access
   - **Options** (`apps/extension/src/chrome-extension/options/index.tsx`): Settings management page
   - Both built as React applications with Tailwind CSS

### Web App Structure
The web app (`apps/web`) is built with Next.js and includes:
- **Landing Page**: Showcases extension features with animated components
- **Waitlist Form**: Collects user emails for launch notifications
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Framer Motion**: Smooth animations and interactions

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
The extension uses Chrome Storage API (`apps/extension/src/services/storage.ts`) to manage:
- User configuration (API keys, language preferences)
- Translation history
- Site-specific enable/disable states
- All data stored locally in Chrome's secure storage

### Message Passing Protocol
Communication between components uses typed messages (`apps/extension/src/types.ts`):
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