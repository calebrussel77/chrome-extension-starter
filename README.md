# AI Translator Pro

A monorepo containing the AI Translator Pro Chrome extension and its companion web application.

## 📦 What's Inside

This monorepo includes the following packages and applications:

- **apps/extension**: Chrome extension for AI-powered translation using OpenAI
- **apps/web**: Next.js landing page with waitlist signup functionality
- **packages/ui**: Shared UI components and utilities
- **packages/eslint-config**: Shared ESLint configuration
- **packages/typescript-config**: Shared TypeScript configuration

## 🚀 Chrome Extension

AI Translator Pro is a powerful Chrome extension that uses OpenAI to provide intelligent translation with configurable language pairs:

- **Configurable Smart Translation**: Auto-detects language and translates between your preferred language pairs
- **10 Pre-configured Language Pairs**: French, Spanish, German, Chinese, Japanese, Italian, Portuguese, Russian, Korean, Arabic ↔ American English
- **Custom Language Configurations**: Define your own primary, secondary, and fallback languages
- **Advanced Slang Understanding**: Properly handles modern American expressions, abbreviations (btw, tldr, etc.), and Gen Z slang
- **Voice-to-text functionality** with automatic translation
- **Flexible Language Controls**: Toggle between smart mode and manual language selection
- **Site-specific activation controls**
- **Modern, animated UI** with loading states and error handling

## Features

### 🧠 **Smart Translation Mode** (Default)
- **Configurable Language Pairs**: Choose from 10 predefined language combinations or create custom configurations
- **Auto-Detection**: Automatically detects between your configured primary and secondary languages
- **Intelligent Translation**: Seamlessly translates between your chosen language pair
- **Slang & Abbreviations**: Understands modern expressions like "dude", "btw", "fire", "no cap", etc. (when English is involved)
- **Cultural Context**: Adapts slang appropriately rather than literal translation
- **Fallback Language**: Automatically translates unrecognized languages to your fallback choice

### 🔧 **Manual Translation Mode**
- **Full Language Control**: Choose from 30+ supported languages
- **Custom Language Pairs**: Set any source and target language combination
- **Traditional Translation**: Classic translation approach for specialized needs

### 🎙️ **Voice Features**
- **Speech-to-Text**: Convert speech to text using your microphone  
- **Auto-Translation**: Transcribed text automatically translates based on your mode settings
- **Smart Voice Processing**: Works with both smart and manual translation modes

### 🌐 **Web Integration**
- **Text Selection Translation**: Automatically translate selected text on web pages
- **Context Menu**: Right-click to translate selections
- **Site Control**: Enable/disable the extension on specific websites
- **Real-time Popup**: Translations appear in elegant popups near selected text

### 💎 **User Experience**
- **Modern UI**: Sleek interface with smooth animations and loading states
- **Flexible Controls**: Easy toggle between smart and manual modes
- **Translation History**: Keep track of your translations
- **Custom Instructions**: Add context for better translation quality
- **Error Handling**: Graceful handling of errors and loading states
- **Offline Indicators**: Clear feedback when features are unavailable

## Installation

### Monorepo Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-translator-pro.git
cd ai-translator-pro
```

2. Install dependencies for all packages:

```bash
pnpm install
```

3. Development mode:

```bash
# Start the Chrome extension development server
pnpm run dev

# Start the web application development server  
pnpm run dev:web

# Build all applications
pnpm run build:all

# Run linting across all packages
pnpm run lint
```

4. Build individual applications:

```bash
# Build extension only
pnpm run build

# Build web app only
pnpm run build:web
```

### Loading the Extension in Chrome

1. Build the extension using `pnpm run build` to generate the `apps/extension/dist` folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `apps/extension/dist` folder
5. The extension should now be installed and visible in your Chrome toolbar

## 🌐 Web Application

The companion web application (`apps/web`) is a Next.js landing page featuring:

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Animated UI**: Smooth animations using Framer Motion  
- **Waitlist Signup**: Email collection for launch notifications
- **Feature Showcase**: Highlights of extension capabilities

### Local Development

```bash
# Start the web application development server
pnpm run dev:web
```

The web app will be available at `http://localhost:3000`

### Deployment

The web application can be deployed to any platform that supports Next.js:

- Vercel (recommended)
- Netlify  
- AWS Amplify
- Docker

## 📁 Project Structure

```
ai-translator-pro/
├── apps/
│   ├── extension/          # Chrome extension
│   │   ├── src/           # Extension source code
│   │   ├── dist/          # Built extension (after build)
│   │   └── package.json   # Extension dependencies
│   └── web/               # Next.js web app
│       ├── src/           # Web app source code
│       ├── .next/         # Next.js build output
│       └── package.json   # Web app dependencies
├── packages/
│   ├── ui/                # Shared UI components
│   ├── eslint-config/     # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── package.json           # Root package configuration
```

## Configuration

### Initial Setup
1. Click on the extension icon in the Chrome toolbar
2. For first-time use, click the settings icon to open options
3. Enter your **OpenAI API key** (required for translations and voice-to-text features)

### Translation Modes
- **Smart Translation** (Default): Automatically handles your configured language pair
- **Manual Mode**: Choose specific source and target languages from 30+ options
- Toggle between modes using the "Smart Translation" switch in the popup

### Smart Translation Configuration
- **Language Pair Presets**: Choose from 10 predefined combinations (French-English, Spanish-English, etc.)
- **Custom Configuration**: Define your own primary, secondary, and fallback languages
- **Real-time Updates**: Changes apply immediately across all translation features

### Additional Settings
- **Auto-translate**: Automatically translate selected text
- **Animations**: Enable/disable UI animations
- **Site Management**: Add domains to disable the extension on specific websites

## Usage

### 📝 **Text Translation**

#### Smart Mode (Default)
1. Configure your preferred language pair in settings (or use default French ↔ English)
2. Select any text on a web page
3. The extension automatically detects your configured languages and translates appropriately
4. Translation appears in an elegant popup near your selection

#### Manual Mode
1. Toggle off "Smart Translation" in the popup
2. Choose your source and target languages
3. Select text and it translates according to your language settings

#### Alternative Methods

- **Context Menu**: Right-click selected text → "Translate selection"
- **Copy & Paste**: Use the popup interface to translate typed text

### 🎙️ **Voice to Text**

1. Click the extension icon to open the popup
2. Switch to the "Voice to Text" tab  
3. Grant microphone permissions if prompted
4. Click the microphone button and speak clearly
5. Your speech gets transcribed to text
6. If auto-translate is on, transcription automatically translates based on your mode settings

#### Smart Voice Translation
- Speak in your primary language → Get translation in secondary language
- Speak in your secondary language → Get translation in primary language
- Other languages → Get translation in your fallback language

### ⚙️ **Settings & Customization**

#### Smart Translation Configuration
- **Language Pair Presets**: Quick selection from 10 popular combinations
- **Custom Configuration**: Define primary, secondary, and fallback languages
- **Instant Application**: Changes apply immediately to all features

#### Translation Customization
- **Custom Instructions**: Add context like "formal tone" or "technical document"
- **Smart Toggle**: Switch between smart and manual modes anytime
- **Language Selection**: Choose from 30+ languages in manual mode

#### Site Management
1. **Per-site Control**: Toggle extension on/off for current site from popup
2. **Global Settings**: Add domains to disabled sites list in options
3. **Instant Changes**: Changes apply immediately without restart

#### Advanced Features
- **Translation History**: View and manage your past translations
- **Copy Functions**: One-click copy for any translation result
- **Error Recovery**: Retry failed translations with improved error handling

## API Keys

This extension requires an OpenAI API key for full functionality:

### OpenAI API Key (Required for Translation and Voice-to-Text)
1. Create an account at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to the API keys section
3. Generate a new API key  
4. Enter the key in the extension options

**Privacy Note**: Your API key is stored locally in Chrome's secure storage and is never sent to any server other than OpenAI endpoints. The extension makes direct API calls to OpenAI services without any intermediary servers.

## Privacy

- The extension only accesses the text you explicitly select on web pages
- All translation happens via direct API calls to OpenAI
- Speech-to-text processing uses OpenAI Whisper API
- No data is stored on external servers
- Your API key is stored securely in Chrome's local storage

## Troubleshooting

- **Extension not working**: Check that you have entered a valid OpenAI API key
- **Translation errors**: Ensure your API key has sufficient quota and permissions
- **Microphone not working**: Check your browser permissions for microphone access
- **Speech recognition not working**: Ensure you're using a supported browser (Chrome, Edge, Safari)

## Technical Details

### AI Models & Architecture

#### Translation Engine
- **Smart Translation**: OpenAI GPT-4o-mini model
  - Configurable language pairs for intelligent translation
  - Enhanced with comprehensive slang and abbreviation knowledge
  - Contextual understanding of modern expressions (dude, btw, fire, no cap, etc.)
  - Cultural adaptation rather than literal translation
- **Manual Translation**: OpenAI GPT-4o-mini for 30+ language pairs

#### Speech Processing
- **Speech-to-Text**: OpenAI Whisper API (whisper-1 model)
  - High accuracy across multiple languages and accents
  - Robust noise handling and audio processing
- **Audio Processing**: Browser's native MediaRecorder API for audio capture

### Dependencies

#### Core APIs
- `openai`: OpenAI TypeScript SDK for translation and speech-to-text functionality  
- Chrome Extensions API for browser integration

#### UI Framework
- **React 18**: Modern component-based UI
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Modern icon system

#### Build Tools
- **Vite**: Fast build tool and development server
- **Chrome Manifest V3**: Latest extension architecture

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## What's New in v2.1 🎉

### 🔧 **Configurable Smart Translation** (NEW!)
- **Language Pair Presets**: 10 predefined combinations including French, Spanish, German, Chinese, Japanese, Italian, Portuguese, Russian, Korean, Arabic ↔ American English
- **Custom Language Configuration**: Define your own primary, secondary, and fallback languages
- **Real-time Configuration**: Settings apply instantly across all translation features
- **Flexible Fallback System**: Automatically translate unrecognized languages to your chosen fallback

### 🧠 **Enhanced Smart Translation Mode**
- **Configurable Auto-detection**: Intelligently detects between your chosen language pair
- **Contextual Translation**: Seamlessly translates between your configured languages
- **Slang Understanding**: Handles modern expressions, abbreviations, and Gen Z slang (when English is involved)
- **Cultural Adaptation**: Natural translations rather than literal word-for-word

### 🎛️ **Enhanced User Control**  
- **Flexible Modes**: Toggle between smart and manual translation
- **Language Selection**: Full control over 30+ language pairs when needed
- **Improved Settings**: Better organized options with smart translation configuration
- **Dynamic Interface**: Popup shows current smart translation configuration

### 🎙️ **Advanced Voice Features**
- **OpenAI Whisper Integration**: Higher accuracy speech recognition
- **Configurable Smart Voice Translation**: Works with your chosen language configuration
- **Better Audio Processing**: Improved noise handling and transcription quality

---

## Credits

- **OpenAI** for providing GPT models and Whisper speech-to-text technology  
- **Chrome Extensions API** for browser integration capabilities
- **React, TypeScript, and Tailwind CSS** for the modern UI framework
- **Framer Motion** for smooth animations and user experience