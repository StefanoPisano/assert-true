window.AssertHub = window.AssertHub || {};

function getResultsDiv() { return document.getElementById('results'); }
function getExportContainer() { return document.getElementById('exportContainer'); }
function getExportContainerBottom() { return document.getElementById('exportContainerBottom'); }

window.AssertHub.formatMarkdown = function (text) {
  // Basic bold formatting: **text** -> <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

window.AssertHub.updateGlobalStatus = function () {
  const state = window.AssertHub.state;
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

  // Enable/Disable export buttons
  const canExport = pendingCount === 0 && total > 0;
  const allButtons = [
    document.getElementById('exportBtn'),
    document.getElementById('exportBtnBottom'),
    document.getElementById('exportExcelBtn'),
    document.getElementById('exportExcelBtnBottom'),
    document.getElementById('exportPdfBtn'),
    document.getElementById('exportPdfBtnBottom')
  ];

  allButtons.forEach(btn => {
    if (!btn) return;
    btn.disabled = !canExport;
    if (btn.disabled) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });

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
  if (totalTests > 0 && testsPassed === totalTests && !state.allTestsPassedPreviously) {
    state.allTestsPassedPreviously = true;
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffca28', '#2e7d32', '#ffffff']
      });
    }
  } else if (testsPassed !== totalTests) {
    state.allTestsPassedPreviously = false;
  }
}

window.AssertHub.updateCardStatus = function (card) {
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

  window.AssertHub.updateGlobalStatus();
}

window.AssertHub.renderTests = function (data) {
  const { metadata, preconditions, tests, errors } = data;
  const resultsDiv = getResultsDiv();
  resultsDiv.innerHTML = '';

  if (!tests.length && !preconditions.length && Object.keys(metadata).length === 0) {
    resultsDiv.innerHTML = '<p>No tests, preconditions or metadata found in the file.</p>';
    document.getElementById('globalProgress').style.display = 'none';
    getExportContainer().style.display = 'none';
    getExportContainerBottom().style.display = 'none';
    return;
  }

  // Handle Metadata Errors
  if (errors && errors.length > 0) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.innerHTML = `
      <h3>⚠️ Missing Mandatory Metadata</h3>
      <p>The following tags are required at the top of your Markdown file:</p>
      <ul>
        ${errors.map(err => `<li>${err}</li>`).join('')}
      </ul>
      <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">Please fix these errors to view and run the test cases.</p>
    `;
    resultsDiv.appendChild(errorDiv);

    document.getElementById('globalProgress').style.display = 'none';
    getExportContainer().style.display = 'none';
    getExportContainerBottom().style.display = 'none';
    return;
  }

  getExportContainer().style.display = 'flex';
  getExportContainerBottom().style.display = 'flex';

  // Render Metadata Card
  if (Object.keys(metadata).length > 0) {
    const metaCard = document.createElement('div');
    metaCard.className = 'test-card border-t-4 dark:border-accent-dark border-accent-light';

    const metaTitle = document.createElement('h2');
    metaTitle.className = 'dark:text-accent-dark text-accent-light text-xl font-bold p-6 pb-2';
    metaTitle.textContent = metadata.name || 'Test Suite';
    metaCard.appendChild(metaTitle);

    const metaGrid = document.createElement('div');
    metaGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 pt-2 text-[0.9rem] opacity-90';

    const fields = [
      { key: 'author', label: '👤 Author' },
      { key: 'version', label: '🏷️ Version' },
      { key: 'date', label: '📅 Date' },
      { key: 'tags', label: '🔖 Tags' },
      { key: 'description', label: '📝 Description', full: true }
    ];

    fields.forEach(field => {
      if (metadata[field.key]) {
        const item = document.createElement('div');
        if (field.full) item.style.gridColumn = '1 / -1';
        item.innerHTML = `<strong>${field.label}:</strong> ${window.AssertHub.formatMarkdown(metadata[field.key])}`;
        metaGrid.appendChild(item);
      }
    });

    metaCard.appendChild(metaGrid);
    resultsDiv.appendChild(metaCard);
  }

  // Render Preconditions
  if (preconditions.length > 0) {
    const preCard = document.createElement('div');
    preCard.className = 'test-card border-l-4 dark:border-accent-dark border-accent-light';

    const preHeader = document.createElement('div');
    preHeader.className = 'test-header';
    preHeader.innerHTML = '<span class="test-header-arrow">▼</span>';
    const preTitle = document.createElement('h3');
    preTitle.className = 'dark:text-accent-dark text-accent-light font-semibold';
    preTitle.textContent = '📋 Preconditions';
    preHeader.appendChild(preTitle);
    preCard.appendChild(preHeader);

    const preContent = document.createElement('div');
    preContent.className = 'test-card-content';
    const preUl = document.createElement('ul');
    preUl.className = 'list-disc pl-5 space-y-1';
    preconditions.forEach(p => {
      const li = document.createElement('li');
      li.className = 'block';
      li.innerHTML = `- ` + window.AssertHub.formatMarkdown(p);
      preUl.appendChild(li);
    });
    preContent.appendChild(preUl);
    preCard.appendChild(preContent);

    preHeader.onclick = () => preCard.classList.toggle('collapsed');

    resultsDiv.appendChild(preCard);
  }

  // Render Tests
  tests.forEach(test => {
    const card = document.createElement('div');
    card.className = 'test-card';

    const header = document.createElement('div');
    header.className = 'test-header';
    header.innerHTML = '<span class="test-header-arrow">▼</span>';

    header.onclick = (e) => {
      if (e.target.closest('button')) return;
      card.classList.toggle('collapsed');
    };

    const title = document.createElement('h3');
    title.className = 'font-semibold dark:text-accent-dark text-accent-light';
    title.textContent = test.title;
    header.appendChild(title);

    const statusBadge = document.createElement('div');
    statusBadge.className = 'test-status status-pending rounded';
    statusBadge.textContent = 'Pending';
    header.appendChild(statusBadge);

    card.appendChild(header);

    // Add Reset Button to Header
    const resetBtn = document.createElement('button');
    resetBtn.className = 'status-btn font-bold ml-2 rounded test-reset-btn !bg-red-600 dark:!bg-red-700 !text-white';
    resetBtn.textContent = 'RESET';
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Reset all steps in "${test.title}"?`)) {
        test.steps.forEach(step => {
          if (step.checks) step.checks.forEach(c => c.status = null);
        });
        const statusBtns = card.querySelectorAll('.status-btn');
        statusBtns.forEach(b => b.classList.remove('active'));
        window.AssertHub.updateCardStatus(card);
        window.AssertHub.RecentFilesManager.saveCurrentState();
      }
    };
    // Add to header after status badge
    header.appendChild(resetBtn);

    // Add Progress Bar to Card
    const cardProgress = document.createElement('div');
    cardProgress.className = 'progress-container';
    cardProgress.innerHTML = `
      <div class="progress-segment pass bg-[#2e7d32]" style="width: 0%"></div>
      <div class="progress-segment fail bg-[#c62828]" style="width: 0%"></div>
      <div class="progress-segment feedback bg-[#f57c00]" style="width: 0%"></div>
      <div class="progress-segment pending bg-white/20" style="width: 100%"></div>
    `;
    card.appendChild(cardProgress);

    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'test-card-content';
    const stepsUl = document.createElement('ul');
    stepsUl.className = 'space-y-4';
    test.steps.forEach((step, stepIndex) => {
      const stepLi = document.createElement('li');
      stepLi.className = 'flex flex-col';
      const stepContainer = document.createElement('div');
      stepContainer.className = 'w-full';

      const stepSpan = document.createElement('span');
      stepSpan.className = 'font-semibold mb-2 block';
      stepSpan.innerHTML = `${stepIndex + 1}. ` + window.AssertHub.formatMarkdown(step.text);
      stepContainer.appendChild(stepSpan);

      if (step.checks && step.checks.length) {
        const checkUl = document.createElement('ul');
        checkUl.className = 'space-y-2 mt-2 ml-4';
        step.checks.forEach(check => {
          const checkLi = document.createElement('li');
          checkLi.className = 'check-item flex items-start w-full';

          const statusGroup = document.createElement('div');
          statusGroup.className = 'flex gap-2 mr-4 mt-1';

          const passBtn = document.createElement('button');
          passBtn.className = 'status-btn pass rounded';
          passBtn.textContent = 'Pass';
          if (check.status === 'Pass') passBtn.classList.add('active');

          const failBtn = document.createElement('button');
          failBtn.className = 'status-btn fail rounded';
          failBtn.textContent = 'Fail';
          if (check.status === 'Fail') failBtn.classList.add('active');

          const feedbackBtn = document.createElement('button');
          feedbackBtn.className = 'status-btn feedback rounded';
          feedbackBtn.textContent = 'Feedback';
          if (check.status === 'Feedback') feedbackBtn.classList.add('active');

          passBtn.onclick = () => {
            const isActive = passBtn.classList.toggle('active');
            failBtn.classList.remove('active');
            feedbackBtn.classList.remove('active');
            check.status = isActive ? 'Pass' : null;
            window.AssertHub.updateCardStatus(card);
            window.AssertHub.RecentFilesManager.saveCurrentState();
          };

          failBtn.onclick = () => {
            const isActive = failBtn.classList.toggle('active');
            passBtn.classList.remove('active');
            feedbackBtn.classList.remove('active');
            check.status = isActive ? 'Fail' : null;
            window.AssertHub.updateCardStatus(card);
            window.AssertHub.RecentFilesManager.saveCurrentState();
          };

          feedbackBtn.onclick = () => {
            const isActive = feedbackBtn.classList.toggle('active');
            passBtn.classList.remove('active');
            failBtn.classList.remove('active');
            check.status = isActive ? 'Feedback' : null;
            window.AssertHub.updateCardStatus(card);
            window.AssertHub.RecentFilesManager.saveCurrentState();
          };

          statusGroup.appendChild(passBtn);
          statusGroup.appendChild(failBtn);
          statusGroup.appendChild(feedbackBtn);
          checkLi.appendChild(statusGroup);

          const checkSpan = document.createElement('span');
          checkSpan.innerHTML = window.AssertHub.formatMarkdown(check.text);
          checkLi.appendChild(checkSpan);
          checkUl.appendChild(checkLi);
        });
        stepContainer.appendChild(checkUl);
      }
      stepLi.appendChild(stepContainer);
      stepsUl.appendChild(stepLi);
    });
    stepsContainer.appendChild(stepsUl);
    card.appendChild(stepsContainer);
    getResultsDiv().appendChild(card);
    window.AssertHub.updateCardStatus(card);
  });
}

window.AssertHub.resetApp = function () {
  const state = window.AssertHub.state;
  state.currentTests = [];
  state.currentPreconditions = [];
  state.currentMetadata = {};
  state.metadataErrors = [];

  getResultsDiv().innerHTML = '';
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('globalProgress').style.display = 'none';
  getExportContainer().style.display = 'none';
  getExportContainerBottom().style.display = 'none';
  document.getElementById('backBtn').classList.add('hidden');
  document.getElementById('floatingShareBtn').classList.add('hidden');

  window.AssertHub.RecentFilesManager.render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.AssertHub.resetAllTests = function () {
  const state = window.AssertHub.state;
  if (!state.currentTests.length) return;
  if (!confirm('Are you sure you want to reset ALL test statuses in this suite?')) return;

  state.currentTests.forEach(test => {
    test.steps.forEach(step => {
      if (step.checks) step.checks.forEach(c => c.status = null);
    });
  });

  const data = {
    metadata: state.currentMetadata,
    preconditions: state.currentPreconditions,
    tests: state.currentTests,
    errors: state.metadataErrors
  };
  window.AssertHub.renderTests(data);
  window.AssertHub.RecentFilesManager.saveCurrentState();
};
