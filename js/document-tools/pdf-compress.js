// ============================================================
// Document Tools - PDF Compress
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('compressBrowseBtn');
  if (!browseBtn) return;

  let file = null;

  const dropZone = document.getElementById('compressDropZone');
  const clearBtn = document.getElementById('compressClearBtn');
  const runBtn = document.getElementById('compressRunBtn');
  const info = document.getElementById('compressInfo');
  const nameEl = document.getElementById('compressFileName');
  const sizeEl = document.getElementById('compressFileSize');

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'PDF Files', extensions: ['pdf'] }
    ]);
    if (f) setFile(f);
  });

  function setFile(f) {
    if (!f.path.toLowerCase().endsWith('.pdf')) return;
    file = f;
    nameEl.textContent = f.name;
    sizeEl.textContent = UT.formatSize(f.size);
    info.style.display = 'block';
    runBtn.disabled = false;
  }

  clearBtn.addEventListener('click', () => {
    file = null;
    info.style.display = 'none';
    runBtn.disabled = true;
  });

  runBtn.addEventListener('click', async () => {
    if (!file) return;
    try {
      const res = await window.api.readFile(file.path);
      if (!res.success) throw new Error(res.error);

      UT.showOverlay('Optimizing PDF...');
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(UT.base64ToUint8(res.data));

      // Strip metadata
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setProducer('');
      doc.setCreator('');

      // Save with object streams (smaller size)
      const outBytes = await doc.save({ useObjectStreams: true });

      const outPath = await window.api.saveFile({
        defaultName: file.name.replace(/\.pdf$/i, '_optimized.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!outPath) { UT.hideOverlay(); return; }

      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();

      const saved = file.size - outBytes.length;
      const pct = ((saved / file.size) * 100).toFixed(1);
      if (saved > 0) {
        UT.showToast(`✅ Saved ${UT.formatSize(saved)} (${pct}% smaller)`, 'success');
      } else {
        UT.showToast('⚠️ Original was already optimized', 'warning');
      }
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      x.name.toLowerCase().endsWith('.pdf'));
    if (f) setFile({ path: f.path, name: f.name, size: f.size });
  });

});