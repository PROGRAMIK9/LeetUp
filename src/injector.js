(function() {
  if (window.__LEETUP_INJECTED) return;
  window.__LEETUP_INJECTED = true;
  console.log('[LeetUp] Injector loaded, hooking fetch and XHR');

  let lastSubmitData = null;

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      let url = args[0];
      if (url && typeof url === 'object' && url.url) {
        url = url.url;
      }
      
      const options = args[1];
      if (typeof url === 'string' && url.includes('/submit/')) {
        try {
          if (options && options.body && typeof options.body === 'string') {
            lastSubmitData = JSON.parse(options.body);
            console.log('[LeetUp] Captured submit data:', lastSubmitData);
          }
        } catch (e) {}
      }

      if (typeof url === 'string' && (url.includes('/graphql') || url.includes('/check/') || url.includes('/submit/'))) {
        const clonedResponse = response.clone();
        clonedResponse.json().then(data => {
          checkAndPostSubmission(data);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[LeetUp] Fetch intercept error:', err);
    }
    return response;
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._leetupUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        if (this._leetupUrl && this._leetupUrl.includes('/check/')) {
          const responseText = this.responseText;
          if (responseText) {
            const data = JSON.parse(responseText);
            checkAndPostSubmission(data);
          }
        }
      } catch (err) {
        console.error('[LeetUp] XHR intercept error:', err);
      }
    });
    return originalXHRSend.apply(this, args);
  };

  function checkAndPostSubmission(data) {
    try {
      let isAccepted = false;
      let submissionData = null;

      // Check for XHR/Fetch /check/ response
      if (data && data.status_msg === 'Accepted' && data.state === 'SUCCESS') {
        console.log('[LeetUp] Detected accepted submission (check format):', data);
        isAccepted = true;
        submissionData = data;
        
        // Merge with captured submit data
        if (lastSubmitData) {
          submissionData.code = lastSubmitData.typed_code || '';
          submissionData.lang = lastSubmitData.lang || '';
          submissionData.question_id = lastSubmitData.question_id || submissionData.question_id;
        }
      }

      // Check for GraphQL response
      if (data && data.data) {
        const submission = data.data.submissionDetails || data.data.submission;
        if (submission) {
          if (submission.statusCode === 10 || submission.status_msg === 'Accepted' || submission.state === 'SUCCESS') {
            console.log('[LeetUp] Detected accepted submission (graphql format):', submission);
            isAccepted = true;
            submissionData = submission;
          }
        }
      }

      if (isAccepted) {
        window.postMessage({
          type: 'LEETUP_SUBMISSION_ACCEPTED',
          data: submissionData
        }, '*');
      }
    } catch (err) {
      console.error('[LeetUp] checkAndPostSubmission error:', err);
    }
  }
})();
