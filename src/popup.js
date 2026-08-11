document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const authSection = document.getElementById('auth-section');
  const loginContainer = document.getElementById('login-container');
  const userContainer = document.getElementById('user-container');
  const settingsSection = document.getElementById('settings-section');
  const statsSection = document.getElementById('stats-section');
  
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const tokenInput = document.getElementById('token-input');
  const loginError = document.getElementById('login-error');
  
  const repoSelect = document.getElementById('repo-select');
  const createRepoBtn = document.getElementById('create-repo-btn');
  const newRepoForm = document.getElementById('new-repo-form');
  const cancelRepoBtn = document.getElementById('cancel-repo-btn');
  const submitRepoBtn = document.getElementById('submit-repo-btn');
  const newRepoName = document.getElementById('new-repo-name');
  const newRepoPrivate = document.getElementById('new-repo-private');
  
  const structureRadios = document.querySelectorAll('input[name="structure"]');
  const customPatternInput = document.getElementById('custom-pattern');
  const commitTemplate = document.getElementById('commit-template');
  const notifToggle = document.getElementById('notif-toggle');
  const notifMessages = document.getElementById('notif-messages');
  const successMsg = document.getElementById('success-msg');
  const failureMsg = document.getElementById('failure-msg');
  
  const totalPushed = document.getElementById('total-pushed');
  const streak = document.getElementById('streak');
  const manualSync = document.getElementById('manual-sync');

  let debounceTimer;

  // Initialize
  init();

  function init() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      if (response && response.authenticated) {
        showLoggedInState(response.user);
      } else {
        showLoggedOutState();
      }
    });

    // Check if on leetcode problem page for manual sync
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('leetcode.com/problems/')) {
          manualSync.classList.remove('hidden');
        }
      });
    }
  }

  // UI State Managers
  function showLoggedInState(user) {
    loginContainer.classList.add('hidden');
    userContainer.classList.remove('hidden');
    settingsSection.classList.remove('hidden');
    statsSection.classList.remove('hidden');
    
    if (user) {
      userName.textContent = user.login || 'User';
      userAvatar.src = user.avatar_url || 'default-avatar.png';
    }

    loadSettings();
    loadRepos();
    loadStats();
  }

  function showLoggedOutState() {
    loginContainer.classList.remove('hidden');
    userContainer.classList.add('hidden');
    settingsSection.classList.add('hidden');
    statsSection.classList.add('hidden');
  }

  // Auth Handlers
  loginBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
      loginError.textContent = 'Please paste a token.';
      loginError.classList.remove('hidden');
      return;
    }

    loginError.classList.add('hidden');
    loginBtn.textContent = 'Connecting...';
    loginBtn.disabled = true;
    
    chrome.runtime.sendMessage({ type: 'LOGIN_WITH_TOKEN', data: { token } }, (response) => {
      loginBtn.textContent = 'Connect';
      loginBtn.disabled = false;
      
      if (chrome.runtime.lastError) {
        loginError.textContent = chrome.runtime.lastError.message || 'Connection failed.';
        loginError.classList.remove('hidden');
        return;
      }
      
      if (response && response.success) {
        tokenInput.value = '';
        showLoggedInState(response.user);
      } else {
        loginError.textContent = response?.error || 'Invalid token or connection failed.';
        loginError.classList.remove('hidden');
      }
    });
  });

  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      showLoggedOutState();
    });
  });

  // Settings Handlers
  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (chrome.runtime.lastError || !settings) return;

      // Set radios
      const struct = settings.folderStructure || 'difficulty';
      const radio = document.querySelector(`input[name="structure"][value="${struct}"]`);
      if (radio) radio.checked = true;
      toggleCustomPattern(struct);

      customPatternInput.value = settings.customPattern || '';
      commitTemplate.value = settings.commitTemplate || '';
      notifToggle.checked = settings.notificationsEnabled !== false;
      toggleNotifMessages(notifToggle.checked);
      successMsg.value = settings.successMessage || '';
      failureMsg.value = settings.failureMessage || '';
    });
  }

  function saveSettings() {
    const settings = {
      folderStructure: document.querySelector('input[name="structure"]:checked')?.value || 'difficulty',
      customPattern: customPatternInput.value,
      commitTemplate: commitTemplate.value,
      notificationsEnabled: notifToggle.checked,
      successMessage: successMsg.value,
      failureMessage: failureMsg.value,
      repo: repoSelect.value
    };

    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', data: settings });
  }

  function debounceSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveSettings, 500);
  }

  // Input event listeners for auto-save
  structureRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleCustomPattern(e.target.value);
      saveSettings();
    });
  });

  customPatternInput.addEventListener('input', debounceSave);
  commitTemplate.addEventListener('input', debounceSave);
  
  notifToggle.addEventListener('change', (e) => {
    toggleNotifMessages(e.target.checked);
    saveSettings();
  });
  
  successMsg.addEventListener('input', debounceSave);
  failureMsg.addEventListener('input', debounceSave);
  
  repoSelect.addEventListener('change', saveSettings);

  function toggleCustomPattern(value) {
    if (value === 'custom') {
      customPatternInput.classList.remove('hidden');
    } else {
      customPatternInput.classList.add('hidden');
    }
  }

  function toggleNotifMessages(enabled) {
    if (enabled) {
      notifMessages.classList.remove('hidden');
    } else {
      notifMessages.classList.add('hidden');
    }
  }

  // Repository Handlers
  function loadRepos() {
    chrome.runtime.sendMessage({ type: 'GET_REPOS' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      
      repoSelect.innerHTML = '<option value="">Select a repository...</option>';
      const repos = response.repos || [];
      
      repos.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo.full_name;
        option.textContent = repo.full_name;
        repoSelect.appendChild(option);
      });
      
      // Load current repo from settings
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
        if (settings && settings.repo) {
          repoSelect.value = settings.repo;
        }
      });
    });
  }

  createRepoBtn.addEventListener('click', () => {
    newRepoForm.classList.remove('hidden');
    createRepoBtn.classList.add('hidden');
  });

  cancelRepoBtn.addEventListener('click', () => {
    newRepoForm.classList.add('hidden');
    createRepoBtn.classList.remove('hidden');
    newRepoName.value = '';
  });

  submitRepoBtn.addEventListener('click', () => {
    const name = newRepoName.value.trim();
    const isPrivate = newRepoPrivate.checked;
    
    if (!name) return;
    
    submitRepoBtn.textContent = '...';
    submitRepoBtn.disabled = true;
    
    chrome.runtime.sendMessage({ 
      type: 'CREATE_REPO', 
      data: { name, isPrivate } 
    }, (response) => {
      submitRepoBtn.textContent = 'Create';
      submitRepoBtn.disabled = false;
      
      if (chrome.runtime.lastError || (response && response.error)) {
        alert(chrome.runtime.lastError?.message || response?.error || 'Failed to create repository');
        return;
      }
      
      newRepoForm.classList.add('hidden');
      createRepoBtn.classList.remove('hidden');
      newRepoName.value = '';
      loadRepos();
    });
  });

  // Stats Handlers
  function loadStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
      if (chrome.runtime.lastError || !stats) return;
      
      animateValue(totalPushed, 0, stats.totalPushed || 0, 1000);
      animateValue(streak, 0, stats.streak || 0, 1000);
    });
  }

  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // Manual Sync
  manualSync.addEventListener('click', () => {
    manualSync.textContent = 'Syncing...';
    manualSync.disabled = true;
    
    chrome.runtime.sendMessage({ type: 'MANUAL_PUSH' }, (response) => {
      manualSync.textContent = '⚡ Manual Sync';
      manualSync.disabled = false;
      
      if (chrome.runtime.lastError || (response && response.error)) {
        alert(chrome.runtime.lastError?.message || response?.error || 'Sync failed');
      } else {
        alert('Sync successful!');
        loadStats();
      }
    });
  });

  // Copy variable hints
  document.querySelectorAll('.var-hint').forEach(hint => {
    hint.addEventListener('click', (e) => {
      const text = e.target.textContent;
      navigator.clipboard.writeText(text);
      
      const originalColor = e.target.style.color;
      e.target.style.color = 'var(--accent-color)';
      setTimeout(() => {
        e.target.style.color = originalColor;
      }, 500);
    });
  });
});
