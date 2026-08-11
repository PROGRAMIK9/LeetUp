try {
  console.log('[LeetUp] Content script loaded on', window.location.href);
  // 1. Inject the interceptor
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/injector.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // 2. Listen for submission messages
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'LEETUP_SUBMISSION_ACCEPTED') {
      try {
        await handleSubmission(event.data.data);
      } catch (err) {
        console.error('[LeetUp] Error handling submission:', err);
        showToast('Error pushing to GitHub', 'error');
      }
    }
  });

  async function handleSubmission(submissionData) {
    // Show initial toast
    const toastId = showToast('Pushing to GitHub...', 'loading');

    // Scrape Data
    let problemNumber = '';
    let problemTitle = '';
    let problemSlug = '';
    
    // Attempt to extract from URL
    const urlMatches = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (urlMatches && urlMatches[1]) {
      problemSlug = urlMatches[1];
      problemTitle = problemSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Try to get from page title e.g. "1. Two Sum - LeetCode"
    const titleText = document.title;
    const titleMatch = titleText.match(/^(\d+)\.\s+(.*?)\s+-/);
    if (titleMatch) {
      problemNumber = titleMatch[1];
      problemTitle = titleMatch[2];
    } else {
      // Fallback selector for some UI versions
      const titleEl = document.querySelector('[data-cy="question-title"]');
      if (titleEl) {
        const text = titleEl.innerText;
        const textMatch = text.match(/^(\d+)\.\s+(.*)/);
        if (textMatch) {
          problemNumber = textMatch[1];
          problemTitle = textMatch[2];
        } else {
          problemTitle = text;
        }
      }
    }
    
    // Fallback: Generate title from slug if DOM scraping failed
    if (problemTitle === 'Unknown' && problemSlug !== 'unknown') {
      problemTitle = problemSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Difficulty
    let difficulty = 'Unknown';
    const difficultyEls = Array.from(document.querySelectorAll('div, span')).filter(el => {
      const text = el.innerText?.trim();
      return ['Easy', 'Medium', 'Hard'].includes(text);
    });
    if (difficultyEls.length > 0) {
      difficulty = difficultyEls[0].innerText.trim();
    }

    // Reliable fallback via GraphQL
    if (difficulty === 'Unknown' || problemNumber === 'Unknown' || !problemNumber) {
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query getQuestionDetail($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId difficulty title } }`,
            variables: { titleSlug: problemSlug }
          })
        });
        const qData = await res.json();
        if (qData?.data?.question) {
          problemNumber = qData.data.question.questionFrontendId || problemNumber;
          difficulty = qData.data.question.difficulty || difficulty;
          problemTitle = qData.data.question.title || problemTitle;
        }
      } catch(e) {
        console.error('[LeetUp] GraphQL fallback failed:', e);
      }
    }

    // Topic Tags
    const tags = [];
    const tagEls = document.querySelectorAll('a[href^="/tag/"]');
    tagEls.forEach(el => tags.push(el.innerText.trim()));

    // Source code and Language
    let code = submissionData?.code || submissionData?.code_views?.[0] || '';
    let language = submissionData?.lang || 'Unknown';

    // Fallback Code
    if (!code) {
      const lines = document.querySelectorAll('.view-lines .view-line');
      if (lines.length > 0) {
        code = Array.from(lines).map(line => line.innerText).join('\n');
      }
    }

    // Stats
    const runtime = submissionData?.status_display || submissionData?.runtime || '';
    const runtimePercentile = submissionData?.runtime_percentile ? `${submissionData.runtime_percentile.toFixed(2)}%` : '';
    const memory = submissionData?.memory || '';
    const memoryPercentile = submissionData?.memory_percentile ? `${submissionData.memory_percentile.toFixed(2)}%` : '';

    const payload = {
      problemNumber: problemNumber || 'Unknown',
      problemTitle,
      problemSlug,
      difficulty,
      language,
      code,
      runtime,
      runtimePercentile,
      memory,
      memoryPercentile,
      tags: [...new Set(tags)],
      timestamp: Date.now(),
      url: window.location.href
    };

    chrome.runtime.sendMessage({ type: 'SUBMISSION_ACCEPTED', data: payload }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[LeetUp] Background error:', chrome.runtime.lastError);
        updateToast(toastId, 'Failed to connect to background', 'error');
      } else if (response && response.success) {
        updateToast(toastId, 'Successfully pushed to GitHub!', 'success');
      } else {
        updateToast(toastId, 'Failed to push to GitHub', 'error');
      }
    });
  }

  // UI Toast Logic
  function showToast(message, status) {
    let container = document.getElementById('leetup-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'leetup-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    
    toast.style.cssText = `
      background: rgba(30, 30, 30, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      transform: translateX(120%);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    toast.innerHTML = getToastContent(message, status);
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    return toastId;
  }

  function getToastContent(message, status) {
    let icon = '⏳';
    if (status === 'success') icon = '✅';
    if (status === 'error') icon = '❌';
    return `<span>${icon}</span> <span>${message}</span>`;
  }

  function updateToast(toastId, message, status) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.innerHTML = getToastContent(message, status);
      
      // Auto dismiss after 4 seconds
      setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 4000);
    }
  }

} catch (err) {
  console.error('[LeetUp] Content script initialization error:', err);
}
