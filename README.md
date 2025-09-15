# Bounty Watch

Bounty Watch is a Chrome extension that helps users quickly check if the current website offers a bug bounty or vulnerability disclosure program.

## Features
- Detects programs on HackerOne, Bugcrowd, Intigriti, YesWeHack, or via `security.txt`.
- Allows manual program links to be added per domain.
- Secure storage of API keys.
- Minimal, clean UI.

## Installation
1. Download or clone this repo.
2. Open Chrome → Extensions → Enable Developer Mode → Load unpacked.
3. Select the project folder.

## Usage
- Click the extension icon → **Check for Bug Bounty Program**.
- If found, results are displayed with direct links.
- If not found, you can add manual program links in settings.

# Bounty Watch v2.0

Bounty Watch is a Chrome extension that helps users quickly check if the current website offers a bug bounty or vulnerability disclosure program with automatic detection and visual indicators.

![Bounty Watch Extension](https://img.shields.io/badge/version-2.0-blue) ![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green)

## ✨ Features

### 🔄 **Automatic Detection**
- **Auto-runs on page load** - Extension automatically checks for bounty programs when you visit a website
- **Smart badge indicators**:
  - ✓ Green checkmark for sites with bug bounty programs
  - ✗ Red X for sites without programs
- **Intelligent caching** - Results cached for 10 minutes to avoid repeated API calls

### 🎨 **Modern UI**
- **Professional design** with glassmorphism effects and gradients
- **Responsive layout** optimized for 400x500px popup window
- **Smooth animations** and loading states
- **Industry-standard sizing** for better usability

### 🔍 **Detection Methods**
- **Platform APIs**: HackerOne, Bugcrowd (with API keys)
- **security.txt** parsing
- **Homepage analysis** for bounty keywords and links
- **Known platform probing**: HackerOne, Bugcrowd, Intigriti, YesWeHack
- **Manual program management** for custom entries

### ⚙️ **Advanced Features**
- **Secure API key storage** in Chrome Sync Storage
- **Manual program database** with domain-specific entries
- **Real-time status updates** and error handling
- **Background monitoring** as you browse

## 📦 Installation

### From Source
1. Download or clone this repository
2. Create the required icon files (see Icon Setup below)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the project folder
6. The extension should now be installed and working!

### Icon Setup
Create PNG icon files in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels) 
- `icon128.png` (128x128 pixels)

Use the included SVG template or create simple blue squares for testing.

## 🚀 Usage

### Automatic Detection
- **Browse normally** - The extension automatically checks each website you visit
- **Check the badge** - Look for ✓ (programs found) or ✗ (no programs) on the extension icon
- **Click for details** - Open the popup to see detailed results and program links

### Manual Checking
- Click the extension icon to open the popup
- Click "Check for Bug Bounty Program" to run a manual check
- View results with direct links to bug bounty programs

### API Configuration
1. Open the extension popup and click the settings gear icon
2. Enter your API keys:
   - **HackerOne API Key**: Get from your HackerOne account settings
   - **Bugcrowd API Key**: Get from your Bugcrowd account settings
3. Click "Save Keys" to store them securely

### Manual Programs
1. Go to Settings → Manual Programs
2. Enter the domain (e.g., `example.com`) and program URL
3. Click "Add Program" to save
4. Programs will be automatically detected for matching domains

## 🔧 Configuration

### API Keys (Optional)
For enhanced detection, configure API keys from major platforms:

- **HackerOne**: Account Settings → API Tokens
- **Bugcrowd**: Profile → API Tokens

API keys are stored securely in Chrome's sync storage and only used for program lookups.

### Manual Programs
Add custom programs for domains not automatically detected:
1. Domain: The website domain (without www or protocol)
2. Program URL: Direct link to the bug bounty program page

## 🛠️ Technical Details

### Architecture
- **Manifest V3** service worker for background processing
- **Automatic tab monitoring** with intelligent caching
- **Badge updates** based on detection results
- **Modern popup UI** with real-time status updates

### Detection Methods Priority
1. **API Results** (when keys are configured) - Most authoritative
2. **security.txt** parsing - RFC 9116 compliant
3. **Homepage analysis** - Keyword and link detection
4. **Platform probing** - Direct checks on known platforms
5. **Manual programs** - User-defined entries

### Caching Strategy
- Results cached for **10 minutes** per domain
- Automatic cache cleanup to prevent memory leaks
- Background checks run only when cache expires

## 🔒 Security & Privacy

- **No data collection** - All processing happens locally
- **Secure API key storage** - Uses Chrome's built-in sync storage
- **CORS-compliant requests** - All external calls follow security policies
- **No tracking or analytics** - Pure functionality focus

## 📊 Version History

### v2.0 (Current)
- ✅ Automatic detection on page load
- ✅ Visual badge indicators (✓/✗)
- ✅ Modern UI with glassmorphism design
- ✅ Industry-standard window sizing (400x500px)
- ✅ Enhanced error handling and user feedback
- ✅ Improved settings page with better UX
- ✅ Smart caching system
- ✅ Background monitoring

### v1.0
- ✅ Manual checking via popup
- ✅ Basic heuristic detection
- ✅ Simple UI

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Known Issues

- Some corporate networks may block external API requests
- CORS policies may prevent checking certain websites
- API rate limits may apply for platform integrations

## 📞 Support

If you encounter issues:
1. Check that you have the latest version
2. Verify your API keys are correctly configured
3. Try disabling and re-enabling the extension
4. Check the Chrome Developer Tools console for errors

## 🔮 Roadmap

- [ ] Support for additional platforms (Synack, Cobalt, etc.)
- [ ] Export/import functionality for manual programs
- [ ] Program statistics and tracking
- [ ] Dark mode support
- [ ] Advanced filtering and search

---

**Find. Report. Reward.** 🛡️

Built with ❤️ for the security research community.
