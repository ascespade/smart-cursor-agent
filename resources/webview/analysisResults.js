(function() {
  const vscode = acquireVsCodeApi();

  // Get data from HTML data attribute or message
  let analysisData = null;
  let recommendationData = null;

  // Initialize
  function init() {
    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateAnalysis') {
        analysisData = message.analysis;
        recommendationData = message.recommendation;
        renderAnalysis();
      }
    });

    // Try to get data from script tag
    const scriptTag = document.querySelector('script[data-analysis]');
    if (scriptTag) {
      try {
        analysisData = JSON.parse(scriptTag.getAttribute('data-analysis'));
        recommendationData = JSON.parse(scriptTag.getAttribute('data-recommendation'));
        renderAnalysis();
      } catch (e) {
        console.error('Failed to parse analysis data:', e);
      }
    }

    // Request data if not available
    if (!analysisData) {
      vscode.postMessage({ command: 'getAnalysis' });
    }
  }

  // Render analysis
  function renderAnalysis() {
    if (!analysisData) return;

    // Update header stats
    document.getElementById('totalErrors').textContent = analysisData.errors.total || 0;
    document.getElementById('totalWarnings').textContent = analysisData.errors.warnings || 0;
    document.getElementById('totalFiles').textContent = analysisData.size?.files || 0;

    // Update summary
    document.getElementById('tsErrors').textContent = analysisData.errors.typescript || 0;
    document.getElementById('eslintErrors').textContent = analysisData.errors.eslint || 0;
    document.getElementById('warnings').textContent = analysisData.errors.warnings || 0;

    // Render errors tree
    renderErrorsTree();

    // Render recommendation
    if (recommendationData) {
      renderRecommendation();
    }
  }

  // Render errors tree
  function renderErrorsTree() {
    const container = document.getElementById('errorsTree');
    if (!container || !analysisData) return;

    container.innerHTML = '';

    // Get error details if available
    const errorDetails = analysisData.errorDetails || null;
    const breakdown = analysisData.errors.breakdown || [];

    // Group 1: TypeScript Errors
    if (analysisData.errors.typescript > 0) {
      const tsNode = createTreeNode({
        label: 'TypeScript Errors',
        count: analysisData.errors.typescript,
        type: 'error',
        icon: 'typescript',
        children: errorDetails?.byFile?.filter(f => 
          f.errors.some(e => e.source === 'typescript')
        ) || []
      });
      container.appendChild(tsNode);
    }

    // Group 2: ESLint Errors
    if (analysisData.errors.eslint > 0) {
      const eslintNode = createTreeNode({
        label: 'ESLint Errors',
        count: analysisData.errors.eslint,
        type: 'error',
        icon: 'eslint',
        children: errorDetails?.byFile?.filter(f => 
          f.errors.some(e => e.source === 'eslint' && e.severity === 'error')
        ) || []
      });
      container.appendChild(eslintNode);
    }

    // Group 3: ESLint Warnings
    if (analysisData.errors.warnings > 0) {
      const warningsNode = createTreeNode({
        label: 'ESLint Warnings',
        count: analysisData.errors.warnings,
        type: 'warning',
        icon: 'warning',
        children: errorDetails?.byFile?.filter(f => 
          f.errors.some(e => e.source === 'eslint' && e.severity === 'warning')
        ) || []
      });
      container.appendChild(warningsNode);
    }

    // If no error details, show breakdown
    if (!errorDetails && breakdown.length > 0) {
      breakdown.forEach(item => {
        const node = createTreeNode({
          label: item.type,
          count: item.count,
          type: item.severity === 'error' ? 'error' : 'warning',
          icon: item.type.toLowerCase(),
          children: item.files || []
        });
        container.appendChild(node);
      });
    }
  }

  // Create tree node
  function createTreeNode(config) {
    const { label, count, type, icon, children } = config;

    const node = document.createElement('div');
    node.className = 'tree-node';

    // Header
    const header = document.createElement('div');
    header.className = 'tree-node-header';
    header.onclick = () => toggleNode(header);

    // Toggle icon
    const toggle = document.createElement('div');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';

    // Type icon
    const typeIcon = document.createElement('div');
    typeIcon.className = `tree-icon ${type}`;
    typeIcon.innerHTML = getIconSvg(icon, type);

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = 'tree-label';
    labelEl.textContent = label;

    // Count badge
    const countBadge = document.createElement('span');
    countBadge.className = `tree-count ${type}`;
    countBadge.textContent = count;

    header.appendChild(toggle);
    header.appendChild(typeIcon);
    header.appendChild(labelEl);
    header.appendChild(countBadge);

    // Children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';

    // Add children
    if (children && children.length > 0) {
      if (typeof children[0] === 'string') {
        // Simple file list
        children.forEach(file => {
          const fileItem = createFileItem(file, null);
          childrenContainer.appendChild(fileItem);
        });
      } else if (children[0]?.file) {
        // File error stats
        children.forEach(fileStats => {
          const fileItem = createFileErrorItem(fileStats);
          childrenContainer.appendChild(fileItem);
        });
      }
    }

    node.appendChild(header);
    node.appendChild(childrenContainer);

    return node;
  }

  // Create file item
  function createFileItem(fileName, errorCount) {
    const item = document.createElement('div');
    item.className = 'file-error-item';
    
    const header = document.createElement('div');
    header.className = 'file-error-header';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = fileName;
    
    header.appendChild(name);
    
    if (errorCount !== null) {
      const count = document.createElement('span');
      count.className = 'file-error-count';
      count.textContent = errorCount;
      header.appendChild(count);
    }
    
    item.appendChild(header);
    return item;
  }

  // Create file error item with details
  function createFileErrorItem(fileStats) {
    const { file, errorCount, warningCount, errors } = fileStats;
    
    const item = document.createElement('div');
    item.className = 'file-error-item';
    
    const header = document.createElement('div');
    header.className = 'file-error-header';
    header.onclick = () => toggleErrorDetails(header.nextElementSibling);
    header.style.cursor = 'pointer';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file;
    
    const count = document.createElement('span');
    count.className = 'file-error-count';
    count.textContent = (errorCount || 0) + (warningCount || 0);
    
    header.appendChild(name);
    header.appendChild(count);
    
    // Error details
    const details = document.createElement('div');
    details.className = 'error-details';
    
    if (errors && errors.length > 0) {
      // Group by error code
      const byCode = groupBy(errors, e => e.code || 'unknown');
      
      Object.entries(byCode).forEach(([code, codeErrors]) => {
        codeErrors.forEach(error => {
          const detailItem = document.createElement('div');
          detailItem.className = 'error-detail-item';
          detailItem.onclick = () => openFile(error.file, error.line, error.column);
          
          detailItem.innerHTML = `
            <span class="error-location">${error.file}:${error.line}:${error.column}</span>
            ${error.code ? `<span class="error-code">${error.code}</span>` : ''}
            <span class="error-message">${escapeHtml(error.message)}</span>
          `;
          
          details.appendChild(detailItem);
        });
      });
    }
    
    item.appendChild(header);
    item.appendChild(details);
    
    return item;
  }

  // Toggle node
  function toggleNode(header) {
    const isExpanded = header.classList.contains('expanded');
    const children = header.nextElementSibling;
    const toggle = header.querySelector('.tree-toggle');
    
    if (isExpanded) {
      header.classList.remove('expanded');
      toggle.classList.remove('expanded');
      children.classList.remove('expanded');
    } else {
      header.classList.add('expanded');
      toggle.classList.add('expanded');
      children.classList.add('expanded');
    }
  }

  // Toggle error details
  function toggleErrorDetails(details) {
    if (details) {
      details.classList.toggle('expanded');
    }
  }

  // Open file in editor
  function openFile(filePath, line, column) {
    vscode.postMessage({
      command: 'openFile',
      file: filePath,
      line: line || 0,
      column: column || 0
    });
  }

  // Get icon SVG
  function getIconSvg(icon, type) {
    const icons = {
      typescript: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      eslint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1 20h22L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    };
    
    return icons[icon] || icons.error;
  }

  // Group array by key
  function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Render recommendation
  function renderRecommendation() {
    if (!recommendationData) return;

    const container = document.getElementById('recommendationContent');
    if (!container) return;

    container.innerHTML = `
      <div class="recommendation-item">
        <div class="recommendation-label">Agent Count</div>
        <div class="recommendation-value">${recommendationData.total || 0}</div>
      </div>
      <div class="recommendation-item">
        <div class="recommendation-label">Models</div>
        <div class="recommendation-value">${recommendationData.models?.length || 0}</div>
      </div>
      <div class="recommendation-item">
        <div class="recommendation-label">Estimated Time</div>
        <div class="recommendation-value">${recommendationData.estimatedTime || 0}h</div>
      </div>
      <div class="recommendation-item">
        <div class="recommendation-label">Estimated Cost</div>
        <div class="recommendation-value">$${(recommendationData.estimatedCost || 0).toFixed(2)}</div>
      </div>
      ${recommendationData.reasoning && recommendationData.reasoning.length > 0 ? `
        <div class="recommendation-item" style="grid-column: 1 / -1;">
          <div class="recommendation-label">Reasoning</div>
          <ul class="reasoning-list">
            ${recommendationData.reasoning.map(r => `<li class="reasoning-item">${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  // Action handlers
  function startFix() {
    vscode.postMessage({ command: 'startFix' });
  }

  function openDashboard() {
    vscode.postMessage({ command: 'openDashboard' });
  }

  function customize() {
    vscode.postMessage({ command: 'customize' });
  }

  // Make functions global
  window.startFix = startFix;
  window.openDashboard = openDashboard;
  window.customize = customize;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

