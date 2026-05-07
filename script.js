const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const resultsDiv = document.getElementById('results');
const exportBtn = document.getElementById('exportBtn');
const exportBtnBottom = document.getElementById('exportBtnBottom');
const exportContainer = document.getElementById('exportContainer');
const exportContainerBottom = document.getElementById('exportContainerBottom');

let currentTests = []; // Global store for the loaded tests

// Open file chooser on click
uploadArea.addEventListener('click', () => fileInput.click());

// Drag‑over style
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.background = 'rgba(255,255,255,0.1)'; });
uploadArea.addEventListener('dragleave', e => { e.preventDefault(); uploadArea.style.background = 'transparent'; });

uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.style.background = 'transparent';
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const md = ev.target.result;
    const data = parseTests(md);
    currentTests = data.tests;
    currentPreconditions = data.preconditions;
    currentMetadata = data.metadata;
    document.getElementById('globalProgress').style.display = 'flex';
    renderTests(data);
  };
  reader.readAsText(file);
}

let currentPreconditions = [];
let currentMetadata = {};

function parseTests(md) {
  const lines = md.split('\n');
  const result = { metadata: {}, preconditions: [], tests: [] };
  let currentTest = null;
  let currentStep = null;
  let inPreconditions = false;

  const metadataRegex = /^--(name|author|description|version|date)\s+(.*)/i;
  const testHeaderRegex = /^(?:#+\s*)?\[Test\s*[^\]]+\]/i;
  const preconditionRegex = /^(?:#+\s*)?\[Preconditions\]/i;
  const preconditionLegacyRegex = /^\*\*Preconditions\*\*/i;
  const stepRegex = /-\s*\[Step\]\s*(.*)/i;
  const checkRegex = /-\s*\[Check\]\s*(?:\[(Pass|Fail|Feedback)\]\s*)?(.*)/i;
  const bulletRegex = /^\s*-\s*(.*)/;

  for (let raw of lines) {
    const line = raw.trim();
    
    // Parse Metadata
    const metaMatch = line.match(metadataRegex);
    if (metaMatch) {
      result.metadata[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
      continue;
    }

    if (preconditionRegex.test(line) || preconditionLegacyRegex.test(line)) {
      inPreconditions = true;
      continue;
    }
    
    if (testHeaderRegex.test(line)) {
      inPreconditions = false;
      if (currentTest) result.tests.push(currentTest);
      currentTest = { title: line.replace(/^#+\s*/, ''), steps: [] };
      currentStep = null;
      continue;
    }

    if (inPreconditions) {
      const bulletMatch = line.match(bulletRegex);
      if (bulletMatch) {
        result.preconditions.push(bulletMatch[1].trim());
      }
      continue;
    }

    if (!currentTest) continue;

    const stepMatch = raw.match(stepRegex);
    if (stepMatch) {
      currentStep = { text: stepMatch[1].trim(), checks: [] };
      currentTest.steps.push(currentStep);
      continue;
    }

    const checkMatch = raw.match(checkRegex);
    if (checkMatch && currentStep) {
      const status = checkMatch[1] ? checkMatch[1].charAt(0).toUpperCase() + checkMatch[1].slice(1).toLowerCase() : null;
      const text = checkMatch[2].trim();
      currentStep.checks.push({ text, status });
      continue;
    }
  }
  if (currentTest) result.tests.push(currentTest);
  return result;
}

function exportResults() {
  if (!currentTests.length && !currentPreconditions.length && Object.keys(currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }
  
  let md = '';
  
  // Export Metadata
  for (const [key, value] of Object.entries(currentMetadata)) {
    md += `--${key} ${value}\n`;
  }
  if (Object.keys(currentMetadata).length > 0) md += '\n';

  if (currentPreconditions.length > 0) {
    md += `### [Preconditions]\n`;
    currentPreconditions.forEach(p => {
      md += `- ${p}\n`;
    });
    md += '\n';
  }

  currentTests.forEach(test => {
    md += `### ${test.title}\n`;
    test.steps.forEach(step => {
      md += `- [Step] ${step.text}\n`;
      step.checks.forEach(check => {
        const statusPart = check.status ? `[${check.status}] ` : '';
        md += `  - [Check] ${statusPart}${check.text}\n`;
      });
    });
    md += '\n';
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test-results.md';
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.onclick = exportResults;
exportBtnBottom.onclick = exportResults;

function formatMarkdown(text) {
  // Basic bold formatting: **text** -> <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

let allTestsPassedPreviously = false;

function updateGlobalStatus() {
  const allCheckItems = document.querySelectorAll('.check-item');
  if (allCheckItems.length === 0) return;

  let passCount = 0;
  let failCount = 0;
  let feedbackCount = 0;
  let pendingCount = 0;

  allCheckItems.forEach(item => {
    const passBtn = item.querySelector('.status-btn.pass');
    const failBtn = item.querySelector('.status-btn.fail');
    const feedbackBtn = item.querySelector('.status-btn.feedback');
    
    if (failBtn.classList.contains('active')) {
      failCount++;
    } else if (feedbackBtn.classList.contains('active')) {
      feedbackCount++;
    } else if (passBtn.classList.contains('active')) {
      passCount++;
    } else {
      pendingCount++;
    }
  });

  const total = allCheckItems.length;
  document.getElementById('globalPass').style.width = (passCount / total * 100) + '%';
  document.getElementById('globalFail').style.width = (failCount / total * 100) + '%';
  document.getElementById('globalFeedback').style.width = (feedbackCount / total * 100) + '%';
  document.getElementById('globalPending').style.width = (pendingCount / total * 100) + '%';
  
  document.getElementById('globalStats').textContent = `Pass: ${passCount} | Fail: ${failCount} | Feedback: ${feedbackCount} | Pending: ${pendingCount}`;

  // Update test-level stats
  const testCards = document.querySelectorAll('.test-card');
  let testsPassed = 0;
  let testsFailed = 0;
  let testsFeedback = 0;
  
  testCards.forEach(card => {
    const badge = card.querySelector('.test-status');
    if (!badge) return; // Skip preconditions/metadata cards
    if (badge.textContent === 'Pass') testsPassed++;
    else if (badge.textContent === 'Fail') testsFailed++;
    else if (badge.textContent === 'Feedback') testsFeedback++;
  });

  const totalTests = testsPassed + testsFailed + testsFeedback + document.querySelectorAll('.test-status.status-pending').length;
  document.getElementById('testStats').textContent = `Passed: ${testsPassed} | Failed: ${testsFailed} | Feedback: ${testsFeedback} | Total: ${totalTests}`;

  // Fireworks / Confetti logic
  if (totalTests > 0 && testsPassed === totalTests && !allTestsPassedPreviously) {
    allTestsPassedPreviously = true;
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffca28', '#2e7d32', '#ffffff']
    });
  } else if (testsPassed !== totalTests) {
    allTestsPassedPreviously = false;
  }
}

function updateCardStatus(card) {
  const statusBadge = card.querySelector('.test-status');
  if (!statusBadge) return; // Skip for preconditions card

  const checkItems = card.querySelectorAll('.check-item');
  const progressBar = card.querySelector('.progress-container');
  
  let passCount = 0;
  let failCount = 0;
  let feedbackCount = 0;
  let pendingCount = 0;

  checkItems.forEach(item => {
    const passBtn = item.querySelector('.status-btn.pass');
    const failBtn = item.querySelector('.status-btn.fail');
    const feedbackBtn = item.querySelector('.status-btn.feedback');
    
    if (failBtn.classList.contains('active')) {
      failCount++;
    } else if (feedbackBtn.classList.contains('active')) {
      feedbackCount++;
    } else if (passBtn.classList.contains('active')) {
      passCount++;
    } else {
      pendingCount++;
    }
  });

  // Update badge
  statusBadge.classList.remove('status-pass', 'status-fail', 'status-feedback', 'status-pending');
  if (failCount > 0) {
    statusBadge.textContent = 'Fail';
    statusBadge.classList.add('status-fail');
  } else if (feedbackCount > 0) {
    statusBadge.textContent = 'Feedback';
    statusBadge.classList.add('status-feedback');
  } else if (pendingCount > 0) {
    statusBadge.textContent = 'Pending';
    statusBadge.classList.add('status-pending');
  } else {
    statusBadge.textContent = 'Pass';
    statusBadge.classList.add('status-pass');
  }

  // Update card progress bar
  if (checkItems.length > 0) {
    const total = checkItems.length;
    card.querySelector('.progress-segment.pass').style.width = (passCount / total * 100) + '%';
    card.querySelector('.progress-segment.fail').style.width = (failCount / total * 100) + '%';
    card.querySelector('.progress-segment.feedback').style.width = (feedbackCount / total * 100) + '%';
    card.querySelector('.progress-segment.pending').style.width = (pendingCount / total * 100) + '%';
  }

  updateGlobalStatus();
}

function renderTests(data) {
  const { metadata, preconditions, tests } = data;
  resultsDiv.innerHTML = '';
  
  if (!tests.length && !preconditions.length && Object.keys(metadata).length === 0) {
    resultsDiv.innerHTML = '<p>No tests, preconditions or metadata found in the file.</p>';
    document.getElementById('globalProgress').style.display = 'none';
    exportContainer.style.display = 'none';
    exportContainerBottom.style.display = 'none';
    return;
  }

  exportContainer.style.display = 'flex';
  exportContainerBottom.style.display = 'flex';

  // Render Metadata Card
  if (Object.keys(metadata).length > 0) {
    const metaCard = document.createElement('div');
    metaCard.className = 'test-card';
    metaCard.style.borderTop = '4px solid var(--accent)';
    metaCard.style.background = 'rgba(255, 255, 255, 0.05)';
    
    const metaTitle = document.createElement('h2');
    metaTitle.style.margin = '0';
    metaTitle.style.padding = '1.5rem 1.5rem 0.5rem 1.5rem';
    metaTitle.style.color = 'var(--accent)';
    metaTitle.textContent = metadata.name || 'Test Suite';
    metaCard.appendChild(metaTitle);

    const metaGrid = document.createElement('div');
    metaGrid.style.display = 'grid';
    metaGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    metaGrid.style.gap = '1rem';
    metaGrid.style.padding = '1rem 1.5rem 1.5rem 1.5rem';
    metaGrid.style.fontSize = '0.9rem';
    metaGrid.style.opacity = '0.9';

    const fields = [
      { key: 'author', label: '👤 Author' },
      { key: 'version', label: '🏷️ Version' },
      { key: 'date', label: '📅 Date' },
      { key: 'description', label: '📝 Description', full: true }
    ];

    fields.forEach(field => {
      if (metadata[field.key]) {
        const item = document.createElement('div');
        if (field.full) item.style.gridColumn = '1 / -1';
        item.innerHTML = `<strong>${field.label}:</strong> ${formatMarkdown(metadata[field.key])}`;
        metaGrid.appendChild(item);
      }
    });

    metaCard.appendChild(metaGrid);
    resultsDiv.appendChild(metaCard);
  }

  // Render Preconditions
  if (preconditions.length > 0) {
    const preCard = document.createElement('div');
    preCard.className = 'test-card';
    preCard.style.borderLeft = '4px solid var(--accent)';
    
    const preHeader = document.createElement('div');
    preHeader.className = 'test-header';
    const preTitle = document.createElement('h3');
    preTitle.textContent = '📋 Preconditions';
    preHeader.appendChild(preTitle);
    preCard.appendChild(preHeader);

    const preUl = document.createElement('ul');
    preconditions.forEach(p => {
      const li = document.createElement('li');
      li.style.display = 'block';
      li.innerHTML = `- ` + formatMarkdown(p);
      preUl.appendChild(li);
    });
    preCard.appendChild(preUl);
    resultsDiv.appendChild(preCard);
  }

  // Render Tests
  tests.forEach(test => {
    const card = document.createElement('div');
    card.className = 'test-card';
    
    const header = document.createElement('div');
    header.className = 'test-header';
    
    header.onclick = (e) => {
      // Don't toggle if clicking a button or something interactive inside header (if any)
      if (e.target.closest('button')) return;
      card.classList.toggle('collapsed');
    };

    const title = document.createElement('h3');
    title.textContent = test.title;
    header.appendChild(title);

    const statusBadge = document.createElement('div');
    statusBadge.className = 'test-status status-pending';
    statusBadge.textContent = 'Pending';
    header.appendChild(statusBadge);

    card.appendChild(header);

    // Add Progress Bar to Card
    const cardProgress = document.createElement('div');
    cardProgress.className = 'progress-container';
    cardProgress.innerHTML = `
      <div class="progress-segment pass" style="width: 0%"></div>
      <div class="progress-segment fail" style="width: 0%"></div>
      <div class="progress-segment feedback" style="width: 0%"></div>
      <div class="progress-segment pending" style="width: 100%"></div>
    `;
    card.appendChild(cardProgress);

    const stepsUl = document.createElement('ul');
    test.steps.forEach((step, stepIndex) => {
      const stepLi = document.createElement('li');
      const stepContainer = document.createElement('div');
      stepContainer.style.width = '100%';

      const stepSpan = document.createElement('span');
      stepSpan.innerHTML = `${stepIndex + 1}. ` + formatMarkdown(step.text);
      stepContainer.appendChild(stepSpan);

      if (step.checks && step.checks.length) {
        const checkUl = document.createElement('ul');
        step.checks.forEach(check => {
          const checkLi = document.createElement('li');
          checkLi.className = 'check-item';
          
          const statusGroup = document.createElement('div');
          statusGroup.className = 'status-group';
          
          const passBtn = document.createElement('button');
          passBtn.className = 'status-btn pass';
          passBtn.textContent = 'Pass';
          if (check.status === 'Pass') passBtn.classList.add('active');
          
          const failBtn = document.createElement('button');
          failBtn.className = 'status-btn fail';
          failBtn.textContent = 'Fail';
          if (check.status === 'Fail') failBtn.classList.add('active');

          const feedbackBtn = document.createElement('button');
          feedbackBtn.className = 'status-btn feedback';
          feedbackBtn.textContent = 'Feedback';
          if (check.status === 'Feedback') feedbackBtn.classList.add('active');

          passBtn.onclick = () => {
            const isActive = passBtn.classList.toggle('active');
            failBtn.classList.remove('active');
            feedbackBtn.classList.remove('active');
            check.status = isActive ? 'Pass' : null;
            updateCardStatus(card);
          };

          failBtn.onclick = () => {
            const isActive = failBtn.classList.toggle('active');
            passBtn.classList.remove('active');
            feedbackBtn.classList.remove('active');
            check.status = isActive ? 'Fail' : null;
            updateCardStatus(card);
          };

          feedbackBtn.onclick = () => {
            const isActive = feedbackBtn.classList.toggle('active');
            passBtn.classList.remove('active');
            failBtn.classList.remove('active');
            check.status = isActive ? 'Feedback' : null;
            updateCardStatus(card);
          };

          statusGroup.appendChild(passBtn);
          statusGroup.appendChild(failBtn);
          statusGroup.appendChild(feedbackBtn);
          checkLi.appendChild(statusGroup);
          
          const checkSpan = document.createElement('span');
          checkSpan.innerHTML = formatMarkdown(check.text);
          checkLi.appendChild(checkSpan);
          checkUl.appendChild(checkLi);
        });
        stepContainer.appendChild(checkUl);
      }
      stepLi.appendChild(stepContainer);
      stepsUl.appendChild(stepLi);
    });
    card.appendChild(stepsUl);
    resultsDiv.appendChild(card);
    updateCardStatus(card);
  });
}


