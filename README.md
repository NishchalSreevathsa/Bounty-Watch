# 🛡️ Bounty Watch - Chrome Extension

> **Find. Report. Reward.** | Automatically detect bug bounty programs on any website with visual indicators and direct links.

![Version](https://img.shields.io/badge/version-2.0-blue) ![Platform](https://img.shields.io/badge/platform-Chrome-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

## 📖 Overview

Bounty Watch is a Chrome extension that automatically detects bug bounty and vulnerability disclosure programs on websites you visit. It provides real-time visual indicators and gives you instant access to program information without any manual setup or configuration.

### 🎯 Key Features

- **🔄 Automatic Detection**: Instantly checks websites as you browse
- **🎯 Visual Badge Indicators**: Shows ✓ (programs found) or ✗ (no programs) on extension icon
- **🔍 Multiple Detection Methods**: Uses security.txt, homepage analysis, and platform probing
- **🌟 Platform Suggestions**: Recommends popular bug bounty platforms when no programs found
- **⚡ Zero Configuration**: Works immediately after installation
- **🎨 Modern UI**: Beautiful, professional interface with smooth animations

## 🚀 Installation Guide

### Method 1: Install from Source (Recommended)

#### Step 1: Download the Extension
1. **Download** all extension files to your computer
2. **Create** a new folder called `bounty-watch-extension`
3. **Copy** all the files into this folder:
   ```
   bounty-watch-extension/
   ├── manifest.json
   ├── background.js
   ├── popup.html
   ├── popup.css
   ├── popup.js
   ├── README.md
   └── icons/
       ├── icon16.png
       ├── icon48.png
       └── icon128.png
   ```

#### Step 2: Create Icon Files
You need to create three icon files. Choose one of these methods:

**Option A: Use the Icon Generator**
1. Use the provided Icon Generator HTML file
2. Click "Download" buttons to get all three sizes
3. Save as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

**Option B: Create Simple Icons**
1. Create three blue squares in any image editor:
   - 16×16 pixels → save as `icon16.png`
   - 48×48 pixels → save as `icon48.png`
   - 128×128 pixels → save as `icon128.png`
2. Place them in the `icons/` folder

#### Step 3: Install in Chrome
1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable "Developer mode"** (toggle switch in top-right corner)
3. **Click "Load unpacked"**
4. **Select** your `bounty-watch-extension` folder
5. **Done!** The extension is now installed and active

### Method 2: Quick Test Installation
```bash
# If you have the files in a ZIP
1. Extract the ZIP file
2. Follow Step 2 and 3 from Method 1
```

## 📱 How to Use

### 🔄 Automatic Detection
The extension works automatically in the background:

1. **Browse normally** - Visit any website
2. **Check the badge** - Look at the extension icon in your toolbar:
   - **✓ Green badge** = Bug bounty program found
   - **✗ Red badge** = No program found
3. **Click for details** - Click the extension icon to see full results

### 🔍 Viewing Results

#### When Programs Are Found:
- **Status**: Shows "Bug bounty programs found!" with green checkmark
- **Program List**: Displays all found programs with:
  - **Platform**: Source of the program (Security.txt, Website, Platform, etc.)
  - **Direct Link**: Clickable link to the bug bounty program

#### When No Programs Found:
- **Status**: Shows "No bug bounty program found" with red X
- **Suggestions**: Lists popular bug bounty platforms:
  - **HackerOne** - World's largest bug bounty platform
  - **Bugcrowd** - Crowdsourced security platform  
  - **Intigriti** - European bug bounty platform
  - **YesWeHack** - Global ethical hacking platform

## 🔧 How It Works

### Detection Methods

The extension uses multiple sophisticated methods to find bug bounty programs:

#### 1. 🔒 Security.txt Parsing
- Checks for `/.well-known/security.txt` and `/security.txt`
- Parses RFC 9116 compliant security contact information
- Extracts bug bounty program URLs from security policies

#### 2. 🏠 Homepage Analysis  
- Scans website homepage for bug bounty keywords
- Looks for terms: "bug bounty", "responsible disclosure", "vulnerability"
- Detects links to known bounty platforms (HackerOne, Bugcrowd, etc.)

#### 3. 🌐 Platform Probing
- Tests direct URLs on major platforms:
  - `https://hackerone.com/{domain}`
  - `https://bugcrowd.com/{domain}`
  - `https://yeswehack.com/programs/{domain}`
  - `https://intigriti.com/bug-bounty/{domain}`

#### 4. ⚡ Smart Caching
- **Caches results** for 10 minutes to improve performance
- **Automatic cleanup** prevents memory leaks
- **Instant responses** for recently checked domains

### Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Content Tab   │ -> │  Background.js   │ -> │   Badge Update  │
│   (Website)     │    │  (Detection)     │    │   (✓ or ✗)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Popup.js       │
                       │   (Show Results) │
                       └──────────────────┘
```

## 🎨 User Interface

### Main Popup Window
- **Header**: Logo, title "Bounty Watch", and subtitle
- **Status Section**: Real-time status with loading/success/error indicators
- **Results Section**: Found programs with platform names and clickable links
- **Suggestions Section**: Popular platforms when no programs found

### Visual Design
- **Modern Gradient Background**: Purple to pink gradient with glassmorphism effects
- **Professional Typography**: Clean, readable fonts with proper contrast
- **Smooth Animations**: Loading spinners, hover effects, and transitions
- **Responsive Layout**: Adapts to different content lengths

## 🛠️ Development

### File Structure Explained

```
bounty-watch-extension/
├── manifest.json          # Extension configuration & permissions
├── background.js          # Service worker for automatic detection
├── popup.html            # Main UI structure
├── popup.css             # Styling and animations  
├── popup.js              # UI logic and user interactions
├── README.md             # This documentation
└── icons/                # Extension icons (16px, 48px, 128px)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Components

#### manifest.json
- **Manifest V3** compliant
- **Permissions**: `activeTab`, `storage`, `tabs`, `<all_urls>`
- **Background**: Service worker registration
- **Action**: Popup configuration

#### background.js  
- **Tab Monitoring**: Listens for tab updates and activations
- **Detection Logic**: Implements all detection methods
- **Badge Management**: Updates extension icon badges
- **Caching System**: Manages result caching for performance

#### popup.js
- **UI Updates**: Handles status indicators and results display
- **Message Passing**: Communicates with background script
- **Suggestions**: Shows platform recommendations
- **Error Handling**: Manages connection and detection errors

### Performance Optimizations

- ⚡ **Smart Caching**: 10-minute cache prevents repeated checks
- 🔄 **Async Operations**: Non-blocking detection methods
- 📦 **Minimal Bundle**: No external dependencies
- 🎯 **Efficient DOM**: Minimal DOM manipulation

## 🔒 Privacy & Security

### Data Handling
- **❌ No Data Collection**: Extension doesn't collect or store personal data
- **🏠 Local Processing**: All detection happens locally in your browser
- **🔒 Secure Requests**: Uses CORS-compliant requests for security
- **⚡ Temporary Cache**: Results cached locally for 10 minutes only

### Permissions Explained
- **`activeTab`**: Access current tab's URL for detection
- **`storage`**: Local caching of results (no personal data)
- **`tabs`**: Monitor tab changes for automatic detection
- **`<all_urls>`**: Check security.txt and homepage content

### Security Features
- **Content Security Policy**: Prevents code injection
- **CORS Compliance**: Secure cross-origin requests
- **No External Scripts**: All code runs locally
- **Input Sanitization**: All user-facing content is properly escaped


## 🙏 Acknowledgments

- **Security Research Community**: For inspiration and feedback
- **Chrome Extension Team**: For excellent documentation and APIs
- **Bug Bounty Platforms**: HackerOne, Bugcrowd, Intigriti, YesWeHack for their APIs and community

## 📞 Support

### Getting Help
- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: Refer to this README for comprehensive guidance
- **Community**: Join security research communities for general discussion

### Feedback
We love hearing from users! Please share:
- **Success Stories**: Programs you discovered using Bounty Watch
- **Feature Requests**: What would make the extension more useful?
- **Bug Reports**: Any issues you encounter while using the extension

---


<strong>Find. Report. Reward.</strong> 🛡️<br>
Built with ❤️ for the security research community
</div>
