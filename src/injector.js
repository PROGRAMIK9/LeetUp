(function() {
  if (window.__LEETUP_INJECTED) return;
  window.__LEETUP_INJECTED = true;
  console.log('[LeetUp] Injector loaded, hooking fetch and XHR');

  let lastSubmitData = null;
  let lastSubmitId = null;
  let lastRunId = null;

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

      if (typeof url === 'string' && (url.includes('/graphql') || url.includes('/check/') || url.includes('/submit/') || url.includes('/interpret_solution/'))) {
        const clonedResponse = response.clone();
        clonedResponse.json().then(data => {
          if (url.includes('/submit/') && data && data.submission_id) {
            lastSubmitId = String(data.submission_id);
            console.log('[LeetUp] Captured submission ID:', lastSubmitId);
          } else if (url.includes('/interpret_solution/') && data && data.interpret_id) {
            lastRunId = String(data.interpret_id);
            console.log('[LeetUp] Captured interpret ID:', lastRunId);
          } else {
            checkAndPostSubmission(data, url);
          }
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
            checkAndPostSubmission(data, this._leetupUrl);
          }
        }
      } catch (err) {
        console.error('[LeetUp] XHR intercept error:', err);
      }
    });
    return originalXHRSend.apply(this, args);
  };

  function checkAndPostSubmission(data, url = '') {
    try {
      let isAccepted = false;
      let submissionData = null;

      // Extract submission/run ID from the polling URL if present (can be numeric or alphanumeric)
      const idMatch = url.match(/\/submissions\/detail\/([a-zA-Z0-9\-_]+)\/check/);
      const checkId = idMatch ? String(idMatch[1]) : null;

      // Check for XHR/Fetch /check/ response
      if (data && data.status_msg === 'Accepted' && data.state === 'SUCCESS') {
        
        // Payload-level checks: a Run contains code_answer or expected_code_answer, and lacks total_correct
        if (data.code_answer !== undefined || data.expected_code_answer !== undefined || data.total_testcases === undefined) {
          console.log('[LeetUp] Ignored Accepted response because payload indicates it is a Run (missing testcase counts or contains run answers)');
          return;
        }

        // If this ID matches a known Run, block it immediately
        if (checkId && lastRunId && checkId === lastRunId) {
          console.log('[LeetUp] Ignored Accepted response because it matches lastRunId');
          return;
        }

        // If we know this is a check URL but it doesn't match our last submit ID (and we have one), it's a Run
        if (checkId && lastSubmitId && checkId !== lastSubmitId) {
          console.log('[LeetUp] Ignored Accepted response for Run/Interpret (not a Submit)');
          return;
        }

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
