(function() {
  const vscode = acquireVsCodeApi();

  // State
  let dashboardData = {
    agents: [],
    progress: {
      overall: 0,
      eta: 0,
      errorsRemaining: 0,
      errorsFixed: 0,
      speed: 0
    },
    logs: [],
    errors: {
      typescript: 0,
      eslint: 0,
      warnings: 0,
      byFile: {},
      byType: {}
    },
    metrics: {
      cost: 0,
      time: 0,
      efficiency: 0,
      quality: 0
    }
  };

  // Initialize
  function init() {
    setupEventListeners();
    requestUpdate();
    setInterval(requestUpdate, 2000); // Update every 2 seconds
  }

  function setupEventListeners() {
    document.getElementById('pauseBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'pause' });
    });

    document.getElementById('resumeBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'resume' });
    });

    document.getElementById('stopBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to stop all agents?')) {
        vscode.postMessage({ command: 'stop' });
      }
    });

    document.getElementById('exportBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'exportReport' });
    });

    document.getElementById('logSearch')?.addEventListener('input', (e) => {
      filterLogs(e.target.value, document.getElementById('logFilter').value);
    });

    document.getElementById('logFilter')?.addEventListener('change', (e) => {
      filterLogs(document.getElementById('logSearch').value, e.target.value);
    });
  }

  function requestUpdate() {
    vscode.postMessage({ command: 'getDashboardData' });
  }

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
      case 'updateDashboard':
        dashboardData = message.data;
        updateDashboard();
        break;
    }
  });

  function updateDashboard() {
    updateStats();
    updateAgentCards();
    updateLogs();
    updateChart();
  }

  function updateStats() {
    const { progress, metrics } = dashboardData;

    document.getElementById('overallProgress').textContent = `${progress.overall}%`;
    document.getElementById('progressFill').style.width = `${progress.overall}%`;

    document.getElementById('errorsFixed').textContent = progress.errorsFixed;
    document.getElementById('totalErrors').textContent = progress.errorsFixed + progress.errorsRemaining;

    document.getElementById('speed').textContent = progress.speed.toFixed(1);

    const etaText = progress.eta > 0 ? `${Math.round(progress.eta)}` : '-';
    document.getElementById('eta').textContent = etaText;

    document.getElementById('cost').textContent = `$${metrics.cost.toFixed(2)}`;

    const timeText = metrics.time < 60
      ? `${Math.round(metrics.time)}m`
      : `${Math.round(metrics.time / 60)}h ${Math.round(metrics.time % 60)}m`;
    document.getElementById('time').textContent = timeText;
  }

  function updateAgentCards() {
    const container = document.getElementById('agentCards');
    if (!container) return;

    container.innerHTML = dashboardData.agents.map(agent => `
      <div class="agent-card">
        <div class="agent-header">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-status ${agent.status}">${agent.status}</div>
        </div>
        <div class="agent-progress">
          <div class="agent-progress-bar">
            <div class="agent-progress-fill" style="width: ${agent.progress}%"></div>
          </div>
        </div>
        <div class="agent-info">
          <span>${agent.currentTask}</span>
          <span>${agent.errorsFixed} errors, ${agent.filesModified} files</span>
        </div>
      </div>
    `).join('');
  }

  function updateLogs() {
    const container = document.getElementById('logContainer');
    if (!container) return;

    const searchTerm = document.getElementById('logSearch')?.value.toLowerCase() || '';
    const filterLevel = document.getElementById('logFilter')?.value || 'all';

    const filteredLogs = dashboardData.logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm);
      const matchesFilter = filterLevel === 'all' || log.level === filterLevel;
      return matchesSearch && matchesFilter;
    });

    container.innerHTML = filteredLogs.slice(-100).map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      return `
        <div class="log-entry ${log.level}">
          <span class="log-timestamp">${time}</span>
          <span class="log-message">${escapeHtml(log.message)}</span>
        </div>
      `;
    }).join('');

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function updateChart() {
    const canvas = document.getElementById('errorChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { errors } = dashboardData;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Simple bar chart
    const data = [
      { label: 'TypeScript', value: errors.typescript, color: '#007acc' },
      { label: 'ESLint', value: errors.eslint, color: '#4caf50' },
      { label: 'Warnings', value: errors.warnings, color: '#ff9800' }
    ];

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = canvas.width / data.length;
    const barHeight = canvas.height * 0.8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    data.forEach((item, index) => {
      const height = (item.value / maxValue) * barHeight;
      const x = index * barWidth + barWidth * 0.1;
      const y = canvas.height - height - 20;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, barWidth * 0.8, height);

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + barWidth * 0.4, canvas.height - 5);
      ctx.fillText(item.value.toString(), x + barWidth * 0.4, y - 5);
    });
  }

  function filterLogs(searchTerm, filterLevel) {
    updateLogs();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on load
  init();
})();

