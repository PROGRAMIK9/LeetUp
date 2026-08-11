const GitHub = (function() {
  const API_URL = 'https://api.github.com';
  
  const extMap = {
    'python3': 'py', 'python': 'py', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
    'javascript': 'js', 'typescript': 'ts', 'go': 'go', 'rust': 'rs',
    'ruby': 'rb', 'swift': 'swift', 'kotlin': 'kt', 'scala': 'scala',
    'csharp': 'cs', 'php': 'php'
  };

  async function request(endpoint, method = 'GET', body = null) {
    const token = await (typeof Storage !== 'undefined' ? Storage.getToken() : null);
    if (!token) throw { status: 401, message: 'No GitHub token found' };

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      let errorMsg = 'GitHub API error';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      throw { status: response.status, message: errorMsg };
    }
    
    if (response.status === 204) return null;
    return await response.json();
  }

  function sanitize(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  }

  return {
    authenticateUser: async function() {
      return await request('/user');
    },
    listRepos: async function() {
      return await request('/user/repos?sort=updated&per_page=100');
    },
    createRepo: async function(name, description, isPrivate) {
      return await request('/user/repos', 'POST', { name, description, private: isPrivate });
    },
    getFile: async function(owner, repo, path) {
      try {
        return await request(`/repos/${owner}/${repo}/contents/${path}`);
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    },
    pushFile: async function(owner, repo, path, content, commitMessage) {
      const existingFile = await this.getFile(owner, repo, path);
      
      const body = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(content))) // handle unicode/utf-8 characters
      };
      
      if (existingFile) {
        body.sha = existingFile.sha;
      }
      
      return await request(`/repos/${owner}/${repo}/contents/${path}`, 'PUT', body);
    },
    generateReadme: function(problemData) {
      const { title, number, url, difficulty, tags, runtime, memory } = problemData;
      
      let color = 'green';
      if (difficulty && difficulty.toLowerCase() === 'medium') color = 'yellow';
      if (difficulty && difficulty.toLowerCase() === 'hard') color = 'red';
      
      const date = new Date().toLocaleString();
      
      let md = `# [${number}. ${title}](${url || ''})\n\n`;
      if (difficulty) {
        md += `![Difficulty](https://img.shields.io/badge/Difficulty-${difficulty}-${color})\n\n`;
      }
      
      if (tags && tags.length > 0) {
        md += `**Tags:** ${tags.map(t => '`' + t + '`').join(', ')}\n\n`;
      }
      
      md += `### Stats\n`;
      if (runtime) md += `- **Runtime:** ${runtime}\n`;
      if (memory) md += `- **Memory:** ${memory}\n`;
      md += `- **Pushed:** ${date}\n`;
      
      return md;
    },
    generatePath: function(problemData, settings) {
      const { title, number, difficulty, language } = problemData;
      const ext = extMap[language && language.toLowerCase()] || 'txt';
      const safeTitle = sanitize(title || '');
      const diffLower = (difficulty || 'unknown').toLowerCase();
      
      const map = {
        '{difficulty}': diffLower,
        '{number}': number || '0',
        '{title}': safeTitle,
        '{ext}': ext
      };

      if (settings.folderStructure === 'custom') {
        let path = settings.customPattern || '{difficulty}/{number}-{title}/solution.{ext}';
        for (const [k, v] of Object.entries(map)) {
          path = path.replace(new RegExp(k, 'g'), v);
        }
        return path;
      } else if (settings.folderStructure === 'topic') {
        const primaryTag = (problemData.tags && problemData.tags.length > 0) ? sanitize(problemData.tags[0]) : 'misc';
        return `${primaryTag}/${map['{number}']}-${safeTitle}/solution.${ext}`;
      } else if (settings.folderStructure === 'flat') {
        return `${map['{number}']}-${safeTitle}.${ext}`;
      }
      
      // Default: difficulty
      return `${diffLower}/${map['{number}']}-${safeTitle}/solution.${ext}`;
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GitHub };
} else if (typeof window !== 'undefined') {
  window.GitHub = GitHub;
}
