const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const resultsDiv = document.getElementById('results');
const exportBtn = document.getElementById('exportBtn');
const exportBtnBottom = document.getElementById('exportBtnBottom');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportExcelBtnBottom = document.getElementById('exportExcelBtnBottom');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportPdfBtnBottom = document.getElementById('exportPdfBtnBottom');
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
    metadataErrors = data.errors;
    document.getElementById('globalProgress').style.display = 'flex';
    renderTests(data);
  };
  reader.readAsText(file);
}

let currentPreconditions = [];
let currentMetadata = {};
let metadataErrors = [];

const MANDATORY_METADATA = [
  { key: 'name', label: '--name' },
  { key: 'author', label: '--author' },
  { key: 'version', label: '--version' }
];

function parseTests(md) {
  const lines = md.split('\n');
  const result = { metadata: {}, preconditions: [], tests: [], errors: [] };
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

  // Validation
  MANDATORY_METADATA.forEach(field => {
    if (!result.metadata[field.key]) {
      result.errors.push(`Missing mandatory metadata tag: <strong>${field.label}</strong>`);
    }
  });

  return result;
}

function exportResults() {
  if (metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!currentTests.length && !currentPreconditions.length && Object.keys(currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }
  
  // Increment version for export
  const oldVersion = parseFloat(currentMetadata.version) || 0;
  const newVersion = (oldVersion + 0.1).toFixed(1);
  
  // Date format yyyymmdd_HHMM
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  const suiteName = (currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateStr}_v${newVersion}_${suiteName}-results.md`;

  let md = '';
  
  // Export Metadata
  for (const [key, value] of Object.entries(currentMetadata)) {
    let val = value;
    if (key === 'version') val = newVersion;
    md += `--${key} ${val}\n`;
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
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel() {
  if (metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!currentTests.length && !currentPreconditions.length && Object.keys(currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }

  const rows = [];
  
  // Add metadata as header rows
  rows.push(["Metadata"]);
  for (const [key, value] of Object.entries(currentMetadata)) {
    rows.push([key, value]);
  }
  rows.push([]); // Spacer

  // Add tests
  rows.push(["Test Suite Details"]);
  rows.push(["Test Case", "Step", "Check", "Status"]);

  currentTests.forEach(test => {
    test.steps.forEach((step, stepIdx) => {
      if (step.checks && step.checks.length > 0) {
        step.checks.forEach((check, checkIdx) => {
          rows.push([
            (stepIdx === 0 && checkIdx === 0) ? test.title : "",
            (checkIdx === 0) ? step.text : "",
            check.text,
            check.status || "Pending"
          ]);
        });
      } else {
        rows.push([
          (stepIdx === 0) ? test.title : "",
          step.text,
          "-",
          "-"
        ]);
      }
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Results");

  // Generate filename similar to MD export
  const oldVersion = parseFloat(currentMetadata.version) || 0;
  const newVersion = (oldVersion + 0.1).toFixed(1);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const suiteName = (currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateStr}_v${newVersion}_${suiteName}-results.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

function exportPdf() {
  if (metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!currentTests.length && !currentPreconditions.length && Object.keys(currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(30, 60, 114);
  doc.text(currentMetadata.name || "Test Results", 14, 20);
  
  // Metadata Table
  const metaData = Object.entries(currentMetadata).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]);
  doc.autoTable({
    startY: 30,
    head: [['Metadata Field', 'Value']],
    body: metaData,
    theme: 'grid',
    headStyles: { fillColor: [30, 60, 114], fontSize: 12 },
    styles: { fontSize: 10, cellPadding: 3 }
  });

  // Tests Table
  const tableData = [];
  currentTests.forEach(test => {
    test.steps.forEach((step, stepIdx) => {
      if (step.checks && step.checks.length > 0) {
        step.checks.forEach((check, checkIdx) => {
          tableData.push([
            (stepIdx === 0 && checkIdx === 0) ? test.title : "",
            (checkIdx === 0) ? step.text : "",
            check.text,
            check.status || "Pending"
          ]);
        });
      } else {
        tableData.push([
          (stepIdx === 0) ? test.title : "",
          step.text,
          "-",
          "-"
        ]);
      }
    });
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [['Test Case', 'Step', 'Check', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 60, 114], fontSize: 12 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25, halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        const status = data.cell.raw;
        if (status === 'Pass') data.cell.styles.textColor = [46, 125, 50];
        if (status === 'Fail') data.cell.styles.textColor = [198, 40, 40];
        if (status === 'Feedback') data.cell.styles.textColor = [245, 124, 0];
      }
    }
  });

  // Filename
  const oldVersion = parseFloat(currentMetadata.version) || 0;
  const newVersion = (oldVersion + 0.1).toFixed(1);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const suiteName = (currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateStr}_v${newVersion}_${suiteName}-results.pdf`;

  doc.save(fileName);
}

exportBtn.onclick = exportResults;
exportBtnBottom.onclick = exportResults;
exportExcelBtn.onclick = exportExcel;
exportExcelBtnBottom.onclick = exportExcel;
exportPdfBtn.onclick = exportPdf;
exportPdfBtnBottom.onclick = exportPdf;

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

  // Enable/Disable export buttons
  const canExport = pendingCount === 0 && total > 0;
  const allButtons = [exportBtn, exportBtnBottom, exportExcelBtn, exportExcelBtnBottom, exportPdfBtn, exportPdfBtnBottom];
  
  allButtons.forEach(btn => {
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
  const { metadata, preconditions, tests, errors } = data;
  resultsDiv.innerHTML = '';
  
  if (!tests.length && !preconditions.length && Object.keys(metadata).length === 0) {
    resultsDiv.innerHTML = '<p>No tests, preconditions or metadata found in the file.</p>';
    document.getElementById('globalProgress').style.display = 'none';
    exportContainer.style.display = 'none';
    exportContainerBottom.style.display = 'none';
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
    exportContainer.style.display = 'none';
    exportContainerBottom.style.display = 'none';
    return;
  }

  exportContainer.style.display = 'flex';
  exportContainerBottom.style.display = 'flex';

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
      li.innerHTML = `- ` + formatMarkdown(p);
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
    statusBadge.className = 'test-status status-pending';
    statusBadge.textContent = 'Pending';
    header.appendChild(statusBadge);

    card.appendChild(header);

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
      stepSpan.innerHTML = `${stepIndex + 1}. ` + formatMarkdown(step.text);
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
    stepsContainer.appendChild(stepsUl);
    card.appendChild(stepsContainer);
    resultsDiv.appendChild(card);
    updateCardStatus(card);
  });
}


