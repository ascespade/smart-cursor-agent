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

  // Animation helpers
  function animateValue(element, start, end, duration = 500) {
    const startTime = performance.now();
    const startValue = parseFloat(start) || 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (end - startValue) * easeOutQuart;

      if (element.textContent.includes('$')) {
        element.textContent = `$${current.toFixed(2)}`;
      } else if (element.textContent.includes('%')) {
        element.textContent = `${Math.round(current)}%`;
      } else {
        element.textContent = Math.round(current).toString();
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  function addPulseAnimation(element) {
    element.style.animation = 'pulse 1s ease-in-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 1000);
  }

  // Initialize
  function init() {
    setupEventListeners();
    setupAnimations();
    requestUpdate();
    setInterval(requestUpdate, 2000);
  }

  function setupAnimations() {
    // Add stagger animation to stat cards
    const statCards = document.querySelectorAll('.stat-card[data-animate]');
    statCards.forEach((card, index) => {
      card.style.setProperty('--index', index);
      card.style.animationDelay = `${index * 0.1}s`;
    });
  }

  function setupEventListeners() {
    document.getElementById('pauseBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'pause' });
      showToast('Execution paused');
    });

    document.getElementById('resumeBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'resume' });
      showToast('Execution resumed');
    });

    document.getElementById('stopBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to stop all agents?')) {
        vscode.postMessage({ command: 'stop' });
        showToast('All agents stopped', 'error');
      }
    });

    document.getElementById('exportBtn')?.addEventListener('click', () => {
      vscode.postMessage({ command: 'exportReport' });
      showToast('Exporting report...');
    });

    document.getElementById('logSearch')?.addEventListener('input', (e) => {
      filterLogs(e.target.value, document.getElementById('logFilter').value);
    });

    document.getElementById('logFilter')?.addEventListener('change', (e) => {
      filterLogs(document.getElementById('logSearch').value, e.target.value);
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'p':
            e.preventDefault();
            document.getElementById('pauseBtn')?.click();
            break;
          case 's':
            e.preventDefault();
            document.getElementById('stopBtn')?.click();
            break;
          case 'e':
            e.preventDefault();
            document.getElementById('exportBtn')?.click();
            break;
        }
      }
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
        const oldData = { ...dashboardData };
        dashboardData = message.data;
        updateDashboard(oldData);
        break;
    }
  });

  function updateDashboard(oldData) {
    updateStats(oldData);
    updateAgentCards(oldData);
    updateLogs(oldData);
    updateChart();
  }

  function updateStats(oldData) {
    const { progress, metrics } = dashboardData;
    const oldProgress = oldData?.progress || {};
    const oldMetrics = oldData?.metrics || {};

    // Animate progress changes
    const progressEl = document.getElementById('overallProgress');
    const progressFillEl = document.getElementById('progressFill');
    const errorsFixedEl = document.getElementById('errorsFixed');
    const totalErrorsEl = document.getElementById('totalErrors');
    const speedEl = document.getElementById('speed');
    const etaEl = document.getElementById('eta');
    const costEl = document.getElementById('cost');
    const timeEl = document.getElementById('time');

    if (oldProgress.overall !== progress.overall) {
      animateValue(progressEl, oldProgress.overall, progress.overall);
      progressFillEl.style.width = `${progress.overall}%`;
      if (progress.overall > oldProgress.overall) {
        addPulseAnimation(progressEl);
      }
    }

    if (oldProgress.errorsFixed !== progress.errorsFixed) {
      animateValue(errorsFixedEl, oldProgress.errorsFixed, progress.errorsFixed);
      addPulseAnimation(errorsFixedEl);
    }

    if (totalErrorsEl) {
      const total = progress.errorsFixed + progress.errorsRemaining;
      totalErrorsEl.textContent = total;
    }

    if (oldProgress.speed !== progress.speed) {
      animateValue(speedEl, oldProgress.speed, progress.speed);
      speedEl.textContent = progress.speed.toFixed(1);
    }

    const etaText = progress.eta > 0 ? `${Math.round(progress.eta)}` : '-';
    if (etaEl && etaEl.textContent !== etaText) {
      etaEl.textContent = etaText;
      if (progress.eta > 0 && oldProgress.eta !== progress.eta) {
        addPulseAnimation(etaEl);
      }
    }

    if (oldMetrics.cost !== metrics.cost) {
      animateValue(costEl, oldMetrics.cost, metrics.cost);
    }

    if (timeEl) {
      const timeText = metrics.time < 60
        ? `${Math.round(metrics.time)}m`
        : `${Math.round(metrics.time / 60)}h ${Math.round(metrics.time % 60)}m`;
      if (timeEl.textContent !== timeText) {
        timeEl.textContent = timeText;
      }
    }
  }

  function updateAgentCards(oldData) {
    const container = document.getElementById('agentCards');
    if (!container) return;

    const oldAgents = oldData?.agents || [];
    const agents = dashboardData.agents;

    // Clear if number of agents changed
    if (oldAgents.length !== agents.length) {
      container.innerHTML = '';
    }

    // Create or update agent cards
    agents.forEach((agent, index) => {
      let card = container.querySelector(`[data-agent-id="${agent.id || index}"]`);

      if (!card) {
        card = document.createElement('div');
        card.className = 'agent-card';
        card.setAttribute('data-agent-id', agent.id || index);
        container.appendChild(card);
      }

      const oldAgent = oldAgents[index];
      const statusChanged = !oldAgent || oldAgent.status !== agent.status;
      const progressChanged = !oldAgent || oldAgent.progress !== agent.progress;

      card.innerHTML = `
        <div class="agent-header">
          <div class="agent-name">${escapeHtml(agent.name || `Agent ${index + 1}`)}</div>
          <div class="agent-status ${agent.status}">${agent.status}</div>
        </div>
        <div class="agent-progress">
          <div class="agent-progress-bar">
            <div class="agent-progress-fill" style="width: ${agent.progress || 0}%"></div>
          </div>
        </div>
        <div class="agent-info">
          <span>${escapeHtml(agent.currentTask || 'Idle')}</span>
          <span>${agent.errorsFixed || 0} errors, ${agent.filesModified || 0} files</span>
        </div>
      `;

      // Add animation on status change
      if (statusChanged) {
        card.style.animation = 'slideInLeft 0.3s ease-out';
        setTimeout(() => {
          card.style.animation = '';
        }, 300);
      }

      // Pulse animation on progress update
      if (progressChanged && agent.progress > (oldAgent?.progress || 0)) {
        const progressFill = card.querySelector('.agent-progress-fill');
        if (progressFill) {
          addPulseAnimation(progressFill);
        }
      }
    });
  }

  function updateLogs(oldData) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    const searchTerm = document.getElementById('logSearch')?.value.toLowerCase() || '';
    const filterLevel = document.getElementById('logFilter')?.value || 'all';

    const filteredLogs = dashboardData.logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm);
      const matchesFilter = filterLevel === 'all' || log.level === filterLevel;
      return matchesSearch && matchesFilter;
    });

    // Hide placeholder if logs exist
    const placeholder = container.querySelector('.log-placeholder');
    if (filteredLogs.length > 0 && placeholder) {
      placeholder.style.display = 'none';
    } else if (filteredLogs.length === 0 && !placeholder) {
      const placeholderEl = document.createElement('div');
      placeholderEl.className = 'log-placeholder';
      placeholderEl.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <p>No logs found</p>
      `;
      container.appendChild(placeholderEl);
    }

    const oldLogs = oldData?.logs || [];
    const newLogs = filteredLogs.slice(-100);
    const newLogCount = newLogs.length - oldLogs.length;

    // Only update if there are new logs
    if (newLogCount > 0) {
      container.innerHTML = newLogs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `
          <div class="log-entry ${log.level}" data-timestamp="${log.timestamp}">
            <span class="log-timestamp">${time}</span>
            <span class="log-message">${escapeHtml(log.message)}</span>
          </div>
        `;
      }).join('');

      // Auto-scroll to bottom with smooth animation
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  function updateChart() {
    const canvas = document.getElementById('errorChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { errors } = dashboardData;

    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Chart data
    const data = [
      { label: 'TypeScript', value: errors.typescript, color: '#007acc' },
      { label: 'ESLint', value: errors.eslint, color: '#10b981' },
      { label: 'Warnings', value: errors.warnings, color: '#f59e0b' }
    ];

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;

    // Draw bars with animation
    data.forEach((item, index) => {
      const height = (item.value / maxValue) * chartHeight;
      const x = padding + index * barWidth + barSpacing;
      const y = canvas.height - padding - height;

      // Gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, item.color + '80');

      // Draw bar with rounded corners
      const barWidthFinal = barWidth - barSpacing * 2;
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidthFinal - radius, y);
      ctx.quadraticCurveTo(x + barWidthFinal, y, x + barWidthFinal, y + radius);
      ctx.lineTo(x + barWidthFinal, y + height);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Label
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--vscode-foreground') || '#ffffff';
      ctx.font = '12px var(--vscode-font-family)';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + (barWidth - barSpacing * 2) / 2, canvas.height - padding + 20);
      ctx.fillText(item.value.toString(), x + (barWidth - barSpacing * 2) / 2, y - 5);
    });
  }

  function filterLogs(searchTerm, filterLevel) {
    updateLogs(dashboardData);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
