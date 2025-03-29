# AI Translator Pro - Chrome Extension

AI Translator Pro is a powerful Chrome extension that uses OpenAI's GPT-4o model to provide:

- Text translation with automatic language detection
- Voice-to-text functionality
- Copy generated text with one click
- Site-specific activation controls
- Modern, animated UI with loading states and error handling

## Features

- **Text Selection Translation**: Automatically detect and translate selected text on web pages
- **Voice-to-Text**: Convert speech to text using your microphone
- **Language Support**: Supports 30+ languages with automatic detection
- **OpenAI Integration**: Leverages GPT-4o for high-quality translations
- **Site Control**: Enable/disable the extension on specific websites
- **Modern UI**: Sleek interface with animations and loading states
- **Error Handling**: Graceful handling of errors and loading states

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-translator-pro.git
cd ai-translator-pro
```

2. Install dependencies:
```bash
npm install
```

3. Development mode:
```bash
npm run dev
```

4. Build the extension:
```bash
npm run build
```

### Loading the Extension in Chrome

1. Build the extension using `npm run build` to generate the `dist` folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `dist` folder
5. The extension should now be installed and visible in your Chrome toolbar

## Configuration

1. Click on the extension icon in the Chrome toolbar
2. For first-time use, click the settings icon and enter your OpenAI API key
3. Configure your preferred source and target languages
4. Toggle auto-translate and animation settings as desired

## Usage

### Text Translation

1. Select text on any web page
2. The extension will automatically translate the selected text (if auto-translate is enabled)
3. Alternatively, right-click and select "Translate selection" from the context menu
4. The translated text will appear in a popup near the selected text

### Voice to Text

1. Click the extension icon to open the popup
2. Switch to the "Voice to Text" tab
3. Click the microphone button and speak
4. Your speech will be transcribed and translated (if auto-translate is enabled)

### Site Management

1. To disable the extension on specific sites, go to the extension options
2. Add domains to the disabled sites list
3. You can also toggle the extension on/off for the current site directly from the popup

## API Key

This extension requires an OpenAI API key to function. You can obtain a key by:

1. Creating an account at [OpenAI Platform](https://platform.openai.com/)
2. Navigating to the API keys section
3. Generating a new API key
4. Entering the key in the extension options

**Note**: Your API key is stored locally in Chrome's secure storage and is never sent to any server other than OpenAI's API endpoints.

## Privacy

- The extension only accesses the text you explicitly select on web pages
- All translation happens via direct API calls to OpenAI
- No data is stored on external servers
- Your API key is stored securely in Chrome's local storage

## Troubleshooting

- **Extension not working**: Check that you have entered a valid OpenAI API key
- **Translation errors**: Ensure your API key has sufficient quota and permissions
- **Microphone not working**: Check your browser permissions for microphone access

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- OpenAI for providing the GPT-4o API
- Chrome Extensions API
- React, TypeScript, and Tailwind CSS for the UI