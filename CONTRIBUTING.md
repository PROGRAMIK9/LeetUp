# Contributing to LeetUp

First off, thank you for considering contributing to LeetUp! It's people like you that make open-source tools great.

This document outlines the process for setting up your local environment, making changes, and submitting those changes for review.

## 🛠️ Local Development Setup

To start developing and modifying the extension, you'll need to load it locally in Developer Mode in Chrome.

1. **Fork the Repository**: Click the "Fork" button at the top right of the repository page to create your own copy.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/<your-username>/LeetUp.git
   cd LeetUp
   ```
3. **Load the Extension into Chrome**:
   - Go to `chrome://extensions/`
   - Turn on **Developer mode** (top right)
   - Click **Load unpacked** (top left)
   - Select the `LeetUp` folder you just cloned.

*Note: Whenever you make changes to the code, you must go back to `chrome://extensions/` and click the refresh icon on the LeetUp extension card, AND refresh your LeetCode tab to see the changes.*

## 🏗️ Architecture Overview

The extension is composed of several key scripts:

- **`manifest.json`**: The core configuration file that defines permissions and tells Chrome where to find the scripts.
- **`src/popup.*`**: HTML, CSS, and JS for the popup menu you see when clicking the extension icon.
- **`src/background.js`**: The Service Worker. This runs in the background, handles authentication, and orchestrates pushing code via the GitHub API.
- **`src/content.js`**: Runs directly on `leetcode.com`. It listens for messages from the injector and scrapes fallback data.
- **`src/injector.js`**: A script injected directly into the LeetCode page's context. It hooks into `window.fetch` and `XMLHttpRequest` to intercept the exact moment a submission is "Accepted", capturing the exact code without relying on easily-broken DOM selectors.
- **`src/github.js`**: A module containing all the logic for communicating with the GitHub API (creating repos, fetching files, pushing commits).

## 🚀 How to Contribute

### 1. Find an Issue
Look through the [Issues](https://github.com/PROGRAMIK9/LeetUp/issues) tab for anything marked `good first issue` or `help wanted`. If you want to add a new feature, please open an issue first to discuss it!

### 2. Create a Branch
Always create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
```
Or for bug fixes:
```bash
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes
Write your code! Make sure to:
- Keep the code clean, readable, and well-commented.
- Test your changes thoroughly by submitting code on LeetCode. Check the browser console (`Right Click -> Inspect -> Console`) for both the page and the extension Service Worker.
- Ensure no console errors are thrown.

### 4. Commit Your Changes
Use descriptive commit messages.
```bash
git add .
git commit -m "feat: added support for custom folders"
```

### 5. Submit a Pull Request
1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Go to the original LeetUp repository and click **Compare & pull request**.
3. Fill out the PR template describing what you changed and why. Provide screenshots if you changed the UI.
4. Wait for a review! We'll look at your code and help get it merged.

## 🐛 Debugging Tips

- **Content Script / Injector errors**: Look at the standard browser Developer Tools console (`F12`) on the LeetCode tab.
- **Background Script / GitHub API errors**: Go to `chrome://extensions/`, find LeetUp, and click on the blue `service worker` link next to "Inspect views". This opens a separate console specifically for the background script.

Thank you for contributing! 🚀
