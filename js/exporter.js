window.AssertHub = window.AssertHub || {};

window.AssertHub.exportResults = function () {
  const state = window.AssertHub.state;
  if (state.metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!state.currentTests.length && !state.currentPreconditions.length && Object.keys(state.currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }

  const now = new Date();
  const dateTimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const suiteName = (state.currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateTimeStr}_${suiteName}-results.md`;

  const md = window.AssertHub.generateMarkdown(state.currentMetadata, state.currentTests, state.currentPreconditions, true);

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

window.AssertHub.exportExcel = function () {
  const state = window.AssertHub.state;
  if (state.metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!state.currentTests.length && !state.currentPreconditions.length && Object.keys(state.currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }

  const rows = [];

  // Add metadata as header rows
  rows.push(["Metadata"]);
  for (const [key, value] of Object.entries(state.currentMetadata)) {
    rows.push([key, value]);
  }
  rows.push([]); // Spacer

  // Add tests
  rows.push(["Test Suite Details"]);
  rows.push(["Test Case", "Step", "Check", "Status"]);

  state.currentTests.forEach(test => {
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

  const worksheet = window.XLSX.utils.aoa_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Test Results");

  // Generate filename similar to MD export
  const now = new Date();
  const dateTimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const suiteName = (state.currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateTimeStr}_${suiteName}-results.xlsx`;

  window.XLSX.writeFile(workbook, fileName);
}

window.AssertHub.exportPdf = function () {
  const state = window.AssertHub.state;
  if (state.metadataErrors.length > 0) {
    alert('Cannot export: Mandatory metadata is missing.');
    return;
  }
  if (!state.currentTests.length && !state.currentPreconditions.length && Object.keys(state.currentMetadata).length === 0) {
    alert('No results to export.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(22);
  doc.setTextColor(30, 60, 114);
  doc.text(state.currentMetadata.name || "Test Results", 14, 20);

  // Metadata Table
  const metaData = Object.entries(state.currentMetadata).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]);
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
  state.currentTests.forEach(test => {
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
    didParseCell: function (data) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        const status = data.cell.raw;
        if (status === 'Pass') data.cell.styles.textColor = [46, 125, 50];
        if (status === 'Fail') data.cell.styles.textColor = [198, 40, 40];
        if (status === 'Feedback') data.cell.styles.textColor = [245, 124, 0];
      }
    }
  });

  // Filename
  const now = new Date();
  const dateTimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const suiteName = (state.currentMetadata.name || 'testsuite').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const fileName = `${dateTimeStr}_${suiteName}-results.pdf`;

  doc.save(fileName);
};

window.AssertHub.shareLink = function () {
  const state = window.AssertHub.state;
  if (state.metadataErrors.length > 0) {
    alert('Cannot share: Mandatory metadata is missing.');
    return;
  }

  const md = window.AssertHub.generateMarkdown(state.currentMetadata, state.currentTests, state.currentPreconditions, false);
  
  try {
    // Encode to Base64 (UTF-8 safe)
    const encoded = btoa(unescape(encodeURIComponent(md)));
    const url = new URL(window.location.href.split('?')[0]); // Remove existing params
    url.searchParams.set('suite', encoded);
    
    const finalUrl = url.toString();
    
    if (finalUrl.length > 8000) {
      alert('Warning: This test suite is very large and the link might not work in all browsers due to URL length limits.');
    }

    navigator.clipboard.writeText(finalUrl).then(() => {
      // Small feedback on the button itself or alert
      alert('🚀 Shareable link copied to clipboard!\n\nAnyone with this link can open this test suite directly.');
    }).catch(err => {
      console.error('Clipboard error:', err);
      prompt('Copy this link to share:', finalUrl);
    });
  } catch (e) {
    console.error('Sharing error:', e);
    alert('Failed to generate share link.');
  }
};
