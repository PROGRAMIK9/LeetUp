const Storage = (function() {
  const DEFAULT_SETTINGS = {
    repo: '',
    folderStructure: 'difficulty',
    customPattern: '{difficulty}/{number}-{title}/solution.{ext}',
    commitTemplate: '✅ {number}. {title} [{difficulty}] — {language}',
    notificationsEnabled: true,
    successMessage: '🎉 Pushed {title} to GitHub!',
    failureMessage: '❌ Failed to push {title}: {error}',
    infoMessage: 'ℹ️ Updating {title}...',
    soundEnabled: false,
  };

  return {
    getToken: async function() {
      const data = await chrome.storage.local.get(['token']);
      return data.token || null;
    },
    setToken: async function(token) {
      await chrome.storage.local.set({ token });
    },
    clearToken: async function() {
      await chrome.storage.local.remove(['token']);
    },
    getUser: async function() {
      const data = await chrome.storage.local.get(['user']);
      return data.user || null;
    },
    setUser: async function(user) {
      await chrome.storage.local.set({ user });
    },
    clearUser: async function() {
      await chrome.storage.local.remove(['user']);
    },
    getSettings: async function() {
      const data = await chrome.storage.sync.get(['settings']);
      return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    },
    saveSettings: async function(settings) {
      const current = await this.getSettings();
      await chrome.storage.sync.set({ settings: { ...current, ...settings } });
    },
    getStats: async function() {
      const data = await chrome.storage.sync.get(['stats']);
      return data.stats || { totalPushed: 0, lastPushDate: null, streak: 0 };
    },
    updateStats: async function() {
      const stats = await this.getStats();
      const today = new Date().toISOString().split('T')[0];
      
      stats.totalPushed += 1;
      
      if (stats.lastPushDate !== today) {
        if (stats.lastPushDate) {
          const lastDate = new Date(stats.lastPushDate);
          const currentDate = new Date(today);
          const diffTime = Math.abs(currentDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays === 1) {
            stats.streak += 1;
          } else {
            stats.streak = 1;
          }
        } else {
          stats.streak = 1;
        }
        stats.lastPushDate = today;
      }
      
      await chrome.storage.sync.set({ stats });
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Storage };
} else if (typeof window !== 'undefined') {
  window.Storage = Storage;
}
