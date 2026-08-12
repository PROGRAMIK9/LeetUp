# 🚀 LeetUp

LeetUp is a powerful, lightweight Chrome extension that automatically pushes your accepted LeetCode solutions directly to your GitHub repository. Keep your GitHub green and automatically maintain a beautiful portfolio of all your solved algorithms!

## ✨ Features

- **Automated Pushing**: Instantly pushes your code to GitHub the moment your LeetCode submission is accepted. No manual syncing required!
- **Detailed READMEs**: Automatically generates and appends a `README.md` file in each problem's folder with the problem description, your runtime stats, and memory usage.
- **Smart Detection**: Uses advanced network interception (instead of fragile DOM scraping) to ensure your code is perfectly captured, regardless of LeetCode's UI changes.
- **Customizable**: Choose your folder structure (by difficulty, topic, flat, etc.) and customize your commit messages.
- **Fast & Secure**: Runs entirely locally in your browser using a GitHub Personal Access Token (PAT). No external servers or middlemen!

## 🛠️ Installation (Local / Developer Mode)

Since this extension is open source and not currently published on the Chrome Web Store, you can easily install it locally in just a few clicks:

1. **Download the code**:
   - Clone this repository: `git clone https://github.com/PROGRAMIK9/LeetUp.git`
   - *Or* click the green **Code** button and download the ZIP file, then extract it.
2. **Open Chrome Extensions**:
   - In Google Chrome, navigate to `chrome://extensions/` in your address bar.
3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top right corner.
4. **Load the Extension**:
   - Click the **Load unpacked** button in the top left.
   - Select the `LeetUp` folder that you just cloned or extracted.
5. **Pin the Extension**:
   - Click the puzzle piece icon 🧩 in your Chrome toolbar and pin LeetUp for easy access!

## ⚙️ Setup & Configuration

To allow LeetUp to push code on your behalf, you need to provide it with a GitHub Personal Access Token (PAT).

1. **Create a GitHub Repository**: 
   - Create a new, empty repository on GitHub (e.g., `My-LeetCode-Solutions`).
2. **Generate a Personal Access Token**:
   - Go to your GitHub [Developer Settings](https://github.com/settings/tokens).
   - Click **Generate new token (classic)**.
   - Give it a note (like "LeetUp Extension").
   - Under **Select scopes**, check the `repo` box (this gives it permission to push code to your repositories).
   - Click **Generate token** at the bottom. **Copy this token immediately** (you won't be able to see it again).
3. **Configure LeetUp**:
   - Click the LeetUp extension icon in your Chrome toolbar.
   - Paste your **Personal Access Token**.
   - Enter your **Repository Name** in the format `Username/RepositoryName` (e.g., `PROGRAMIK9/My-LeetCode-Solutions`).
   - Click **Authenticate**!

That's it! Go solve a problem on LeetCode. Once you hit **Submit** and it gets accepted, LeetUp will automatically push it to your repo!

## 📂 Project Structure

- `manifest.json`: The Chrome extension configuration.
- `src/injector.js`: Intercepts LeetCode network requests to capture your exact code.
- `src/content.js`: Communicates between the webpage and the background script.
- `src/background.js`: Handles the core logic and GitHub API communication.
- `src/github.js`: Helper functions for interacting with the GitHub REST API.
- `src/popup.*`: The UI for the extension dropdown menu.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/PROGRAMIK9/LeetUp/issues). 

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
