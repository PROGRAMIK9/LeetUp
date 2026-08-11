importScripts('storage.js', 'github.js', 'notifications.js');



// Install handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('LeetUp extension installed and service worker active.');
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUBMISSION_ACCEPTED' || request.type === 'MANUAL_PUSH') {
    handleSubmission(request.data).then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'LOGIN_WITH_TOKEN') {
    handleTokenLogin(request.data).then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true;
  }
  
  if (request.type === 'LOGOUT') {
    handleLogout().then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true;
  }
  
  if (request.type === 'GET_AUTH_STATUS') {
    handleGetAuthStatus().then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true;
  }
  
  if (request.type === 'GET_REPOS') {
    handleGetRepos().then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true;
  }
  
  if (request.type === 'CREATE_REPO') {
    handleCreateRepo(request.data).then(sendResponse).catch(err => {
      console.error(err);
      sendResponse({ success: false, error: err.message || err });
    });
    return true;
  }
  
  if (request.type === 'GET_STATS') {
    Storage.getStats()
      .then(stats => sendResponse({ success: true, ...stats }))
      .catch(err => sendResponse({ success: false, error: err.message || err }));
    return true;
  }

  if (request.type === 'GET_SETTINGS') {
    Storage.getSettings()
      .then(settings => sendResponse(settings))
      .catch(err => sendResponse(null));
    return true;
  }

  if (request.type === 'SAVE_SETTINGS') {
    Storage.saveSettings(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message || err }));
    return true;
  }
});

async function handleSubmission(data = {}) {
  const settings = await Storage.getSettings();
  const token = await Storage.getToken();
  
  if (!token) {
    const errorMsg = 'Not authenticated. Please login via the LeetUp popup.';
    Notifications.showNotification('LeetUp — Error', errorMsg);
    return { success: false, error: errorMsg };
  }
  
  if (!settings.repo) {
    const errorMsg = 'No repository selected. Please choose one in LeetUp settings.';
    Notifications.showNotification('LeetUp — Error', errorMsg);
    return { success: false, error: errorMsg };
  }

  let mappedData = null;
  try {
    const [owner, repo] = settings.repo.split('/');
    
    // Map content script field names to what GitHub module expects
    mappedData = {
      title: data.problemTitle || data.title || '',
      number: data.problemNumber || data.number || '',
      difficulty: data.difficulty || '',
      language: data.language || '',
      code: data.code || '',
      runtime: data.runtime + (data.runtimePercentile ? ` (${data.runtimePercentile})` : ''),
      memory: data.memory + (data.memoryPercentile ? ` (${data.memoryPercentile})` : ''),
      tags: data.tags || [],
      url: data.url || '',
      date: new Date().toISOString().split('T')[0],
      repo: settings.repo
    };
    
    // Generate file path and templates
    const solutionPath = GitHub.generatePath(mappedData, settings);
    const commitTemplate = settings.commitTemplate || '✅ {number}. {title} [{difficulty}] — {language}';
    const commitMessage = Notifications.processTemplate(commitTemplate, mappedData);

    // Push the solution file
    await GitHub.pushFile(owner, repo, solutionPath, mappedData.code, commitMessage);
    
    // Derive README path and fetch existing content to append
    const pathParts = solutionPath.split('/');
    pathParts.pop(); // Remove filename
    const readmePath = (pathParts.length > 0 ? pathParts.join('/') + '/' : '') + 'README.md';
    
    let readmeContent = '';
    try {
      const existingReadme = await GitHub.getFile(owner, repo, readmePath);
      if (existingReadme && existingReadme.content) {
        // Decode base64 utf-8
        const existingText = decodeURIComponent(escape(atob(existingReadme.content)));
        // Append new stats to the existing README
        readmeContent = existingText + `\n\n### Stats (Pushed ${mappedData.date})\n`;
        if (mappedData.runtime) readmeContent += `- **Runtime:** ${mappedData.runtime}\n`;
        if (mappedData.memory) readmeContent += `- **Memory:** ${mappedData.memory}\n`;
      } else {
        readmeContent = GitHub.generateReadme(mappedData);
      }
      await GitHub.pushFile(owner, repo, readmePath, readmeContent, `docs: append stats for ${mappedData.title}`);
    } catch(e) {
      console.error('README push failed', e);
    }
    
    // Update stats
    await Storage.updateStats();
    
    // Notify user
    Notifications.notifySuccess(mappedData, settings);
    
    return { success: true };
  } catch (err) {
    if (mappedData) {
      Notifications.notifyFailure(mappedData, settings, err);
    } else {
      Notifications.notifyFailure(data, settings, err);
    }
    return { success: false, error: err.message || String(err) };
  }
}

async function handleTokenLogin(data) {
  const { token } = data;
  if (!token) {
    throw new Error('No token provided.');
  }

  // Store the token first so GitHub.authenticateUser() can use it
  await Storage.setToken(token);

  try {
    // Validate token by fetching user profile
    const user = await GitHub.authenticateUser();
    await Storage.setUser(user);
    return { success: true, user };
  } catch (err) {
    // Token was invalid — clear it
    await Storage.clearToken();
    throw new Error('Invalid token. Make sure it has the "repo" scope.');
  }
}

async function handleLogout() {
  await Storage.clearToken();
  await Storage.clearUser();
  return { success: true };
}

async function handleGetAuthStatus() {
  const token = await Storage.getToken();
  const user = await Storage.getUser();
  return {
    success: true,
    authenticated: !!token,
    user: user || null
  };
}

async function handleGetRepos() {
  const repos = await GitHub.listRepos();
  return { success: true, repos };
}

async function handleCreateRepo(data) {
  const repo = await GitHub.createRepo(data.name, data.private);
  return { success: true, repo };
}
