window.AssertHub = window.AssertHub || {};

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const exportBtn = document.getElementById('exportBtn');
const exportBtnBottom = document.getElementById('exportBtnBottom');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportExcelBtnBottom = document.getElementById('exportExcelBtnBottom');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportPdfBtnBottom = document.getElementById('exportPdfBtnBottom');
const homeLink = document.getElementById('homeLink');
const backBtn = document.getElementById('backBtn');
const floatingShareBtn = document.getElementById('floatingShareBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const resetAllBtnBottom = document.getElementById('resetAllBtnBottom');

// Initialize event listeners
if (uploadArea) uploadArea.addEventListener('click', () => fileInput && fileInput.click());

if (uploadArea) {
  uploadArea.addEventListener('dragover', e => { 
    e.preventDefault(); 
    uploadArea.style.background = 'rgba(255,255,255,0.1)'; 
  });

  uploadArea.addEventListener('dragleave', e => { 
    e.preventDefault(); 
    uploadArea.style.background = 'transparent'; 
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.background = 'transparent';
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

if (exportBtn) exportBtn.onclick = window.AssertHub.exportResults;
if (exportBtnBottom) exportBtnBottom.onclick = window.AssertHub.exportResults;
if (exportExcelBtn) exportExcelBtn.onclick = window.AssertHub.exportExcel;
if (exportExcelBtnBottom) exportExcelBtnBottom.onclick = window.AssertHub.exportExcel;
if (exportPdfBtn) exportPdfBtn.onclick = window.AssertHub.exportPdf;
if (exportPdfBtnBottom) exportPdfBtnBottom.onclick = window.AssertHub.exportPdf;

if (homeLink) homeLink.onclick = window.AssertHub.resetApp;
if (backBtn) backBtn.onclick = window.AssertHub.resetApp;
if (floatingShareBtn) floatingShareBtn.onclick = window.AssertHub.shareLink;
if (resetAllBtn) resetAllBtn.onclick = window.AssertHub.resetAllTests;
if (resetAllBtnBottom) resetAllBtnBottom.onclick = window.AssertHub.resetAllTests;

window.resetApp = window.AssertHub.resetApp; // Keep it global for the HTML onclick if needed

const MAX_FILE_SIZE = 15 * 1024; // 15KB

function handleFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large (${(file.size / 1024).toFixed(1)}KB). To ensure sharing via link works reliably, please keep test suite files under 15KB.`);
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const md = ev.target.result;
    const data = window.AssertHub.parseTests(md);
    window.AssertHub.processTestData(data, md, true);
  };
  reader.readAsText(file);
}

window.AssertHub.processTestData = function(data, rawMd, shouldSave) {
  const state = window.AssertHub.state;
  state.currentTests = data.tests;
  state.currentPreconditions = data.preconditions;
  state.currentMetadata = data.metadata;
  state.metadataErrors = data.errors;
  
  if (state.metadataErrors.length === 0 && shouldSave) {
    window.AssertHub.RecentFilesManager.save(state.currentMetadata, rawMd);
  }
  
  // Hide home elements
  document.getElementById('uploadArea').style.display = 'none';
  document.getElementById('recentFilesContainer').style.display = 'none';
  document.getElementById('backBtn').classList.remove('hidden');
  
  document.getElementById('globalProgress').style.display = 'flex';
  document.getElementById('floatingShareBtn').classList.remove('hidden');
  window.AssertHub.renderTests(data);
  
  // Scroll to top of results
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Initial render of recent files
console.log('Main module initializing...');
window.AssertHub.setOnFileLoadCallback(window.AssertHub.processTestData);
window.AssertHub.RecentFilesManager.render();
console.log('Recent files rendered.');

// Check for shared suite in URL
const urlParams = new URLSearchParams(window.location.search);
const sharedSuite = urlParams.get('suite');
if (sharedSuite) {
  try {
    const decodedMd = decodeURIComponent(escape(atob(sharedSuite)));
    const data = window.AssertHub.parseTests(decodedMd);
    window.AssertHub.processTestData(data, decodedMd, true);
    // Clean up URL without refreshing
    window.history.replaceState({}, document.title, window.location.pathname);
    console.log('Shared suite loaded successfully.');
  } catch (e) {
    console.error('Failed to load shared suite:', e);
  }
}
