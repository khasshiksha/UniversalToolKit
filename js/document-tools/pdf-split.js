// ============================================================
// Document Tools - PDF Split
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const splitBrowseBtn = document.getElementById('splitBrowseBtn');
  if (!splitBrowseBtn) return;

  let splitFile = null;
  let splitTotalPages = 0;

  const splitClearBtn = document.getElementById('splitClearBtn');
  const splitRunBtn = document.getElementById('splitRunBtn');
  const splitInfo = document.getElementById('splitInfo');
  const splitOptions = document.getElementById('splitOptions');
  const splitFileName = document.getElementById('splitFileName');
  const splitPageCount = document.getElementById('splitPageCount');
  const splitPagesInput = document.getElementById('splitPagesInput');
  const splitDropZone = document.getElementById('splitDropZone');

  splitBrowseBtn.addEventListener('click', async () => {
    const file = await window.api.openSingle([
      { name: 'PDF Files', extensions: ['pdf'] }
    ]);
    if (file) loadFile(file);
  });

  async function loadFile(file) {
    if (!file.path.toLowerCase().endsWith('.pdf')) {
      UT.showToast('Please choose a PDF file', 'warning');
      return;
    }
    UT.showOverlay('Loading PDF...');
    try {
      const res = await window.api.readFile(file.path);
      if (!res.success) throw new Error(res.error);
      const bytes = UT.base64ToUint8(res.data);
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(bytes);

      splitFile = file;
      splitTotalPages = doc.getPageCount();
      splitFileName.textContent = file.name;
      splitPageCount.textContent = splitTotalPages;
      splitInfo.style.display = 'block';
      splitOptions.style.display = 'flex';
      splitRunBtn.disabled = false;
      UT.hideOverlay();
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  }

  splitClearBtn.addEventListener('click', () => {
    splitFile = null;
    splitTotalPages = 0;
    splitInfo.style.display = 'none';
    splitOptions.style.display = 'none';
    splitRunBtn.disabled = true;
    splitPagesInput.value = '';
  });

  splitRunBtn.addEventListener('click', async () => {
    if (!splitFile) return;
    const mode = document.querySelector('input[name="splitMode"]:checked').value;

    try {
      const res = await window.api.readFile(splitFile.path);
      if (!res.success) throw new Error(res.error);
      const bytes = UT.base64ToUint8(res.data);
      const { PDFDocument } = PDFLib;
      const srcDoc = await PDFDocument.load(bytes);

      if (mode === 'each') {
        // Split every page into a separate file
        const basePath = await window.api.saveFile({
          defaultName: splitFile.name.replace(/\.pdf$/i, '_page1.pdf'),
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (!basePath) return;

        const prefix = basePath.replace(/_page\d+\.pdf$/i, '').replace(/\.pdf$/i, '');

        UT.showOverlay('Splitting pages...');
        for (let i = 0; i < splitTotalPages; i++) {
          UT.showOverlay(`Saving page ${i + 1} / ${splitTotalPages}...`);
          const newDoc = await PDFDocument.create();
          const [page] = await newDoc.copyPages(srcDoc, [i]);
          newDoc.addPage(page);
          const outBytes = await newDoc.save();
          await window.api.writeFile(`${prefix}_page${i + 1}.pdf`, UT.uint8ToBase64(outBytes));
        }
        UT.hideOverlay();
        UT.showToast(`✅ Split into ${splitTotalPages} files`, 'success');
        setTimeout(() => window.api.showInFolder(prefix + '_page1.pdf'), 300);

      } else {
        // Extract specific pages
        const pages = UT.parsePageRanges(splitPagesInput.value, splitTotalPages);
        if (!pages.length) {
          UT.showToast('⚠️ Enter valid page numbers', 'warning');
          return;
        }

        const outPath = await window.api.saveFile({
          defaultName: splitFile.name.replace(/\.pdf$/i, '_extracted.pdf'),
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (!outPath) return;

        UT.showOverlay('Extracting pages...');
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, pages);
        copied.forEach(p => newDoc.addPage(p));
        const outBytes = await newDoc.save();
        await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));

        UT.hideOverlay();
        UT.showToast(`✅ Extracted ${pages.length} pages`, 'success');
        setTimeout(() => window.api.showInFolder(outPath), 300);
      }
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  splitDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    splitDropZone.classList.add('drag-over');
  });
  splitDropZone.addEventListener('dragleave', () => {
    splitDropZone.classList.remove('drag-over');
  });
  splitDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    splitDropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      x.name.toLowerCase().endsWith('.pdf'));
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});