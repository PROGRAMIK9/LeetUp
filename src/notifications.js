const Notifications = {
  /**
   * Replaces {variable} placeholders with actual values from data
   * @param {string} template - The string template
   * @param {Object} data - The data object containing variables
   * @returns {string} The processed string
   */
  processTemplate(template, data) {
    if (!template) return '';
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      if (data.hasOwnProperty(key)) {
        const val = data[key];
        return Array.isArray(val) ? val.join(', ') : val;
      }
      return match;
    });
  },

  /**
   * Shows a Chrome system notification
   * @param {string} title - The notification title
   * @param {string} message - The notification message
   * @param {string} [iconUrl] - Optional icon URL, defaults to extension icon
   */
  showNotification(title, message, iconUrl = 'icons/icon128.png') {
    const fullIconUrl = iconUrl.startsWith('chrome-extension://') ? iconUrl : chrome.runtime.getURL(iconUrl);
    const options = {
      type: 'basic',
      title: title,
      message: message,
      iconUrl: fullIconUrl
    };
    
    // Auto-generate unique notification ID
    const notificationId = 'leetup_notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    chrome.notifications.create(notificationId, options);
  },

  /**
   * Shows a success notification
   * @param {Object} data - The submission data
   * @param {Object} settings - User settings containing the template
   */
  notifySuccess(data, settings) {
    const template = settings.successMessage || 'Successfully pushed {title} to GitHub.';
    const message = this.processTemplate(template, data);
    this.showNotification('LeetUp — Success!', message);
  },

  /**
   * Shows a failure notification
   * @param {Object} data - The submission data
   * @param {Object} settings - User settings containing the template
   * @param {Error|string} error - The error object or message
   */
  notifyFailure(data, settings, error) {
    const template = settings.failureMessage || 'Failed to push {title}: {error}';
    const errorMsg = error.message || error.toString();
    
    // Create a new data object including the error message
    const templateData = Object.assign({}, data, { error: errorMsg });
    const message = this.processTemplate(template, templateData);
    
    this.showNotification('LeetUp — Error', message);
  },

  /**
   * Shows an info notification
   * @param {Object} data - The submission data
   * @param {Object} settings - User settings containing the template
   */
  notifyInfo(data, settings) {
    const template = settings.infoMessage || '{title} info.';
    const message = this.processTemplate(template, data);
    this.showNotification('LeetUp', message);
  }
};
