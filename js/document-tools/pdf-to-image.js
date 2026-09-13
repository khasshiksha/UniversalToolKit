// ============================================================
// Document Tools - PDF to Image
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('p2iBrowseBtn');
  if (!browseBtn) return;

  let file = null;
  let totalPages = 0;
  let quality = 2;

  const dropZone = document.getElementById('p2iDropZone');
  const clearBtn = document.getElementById('p2iClearBtn');
  const runBtn = document.getElementById('p2iRunBtn');
  const info = document.getElementById('p2iInfo');
  const options = document.getElementById('p2iOptions');
  const nameEl = document.getElementById('p2iFileName');
  const pageCountEl = document.getElementById('p2iPageCount');

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'PDF Files', extensions: ['pdf'] }
    ]);
    if (f) loadFile(f);
  });

  async function loadFile(f) {
    if (!f.path.toLowerCase().endsWith('.pdf')) return;
    UT.showOverlay('Loading PDF...');
    try {
      const res = await window.api.readFile(f.path);
      const bytes = UT.base64ToUint8(res.data);
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

      file = f;
      totalPages = pdf.numPages;
      nameEl.textContent = f.name;
      pageCountEl.textContent = totalPages;
      info.style.display = 'block';
      options.style.display = 'flex';
      runBtn.disabled = false;
      UT.hideOverlay();
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  }

  clearBtn.addEventListener('click', () => {
    file = null;
    info.style.display = 'none';
    options.style.display = 'none';
    runBtn.disabled = true;
  });

  UT.bindGroup('.quality-btn', b => { quality = +b.dataset.q; });

  runBtn.addEventListener('click', async () => {
    if (!file) return;
    try {
      const res = await window.api.readFile(file.path);
      const bytes = UT.base64ToUint8(res.data);
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

      // Ask for first file path to derive prefix
      const firstPath = await window.api.saveFile({
        defaultName: file.name.replace(/\.pdf$/i, '_page1.png'),
        filters: [{ name: 'PNG', extensions: ['png'] }]
      });
      if (!firstPath) return;
      const prefix = firstPath.replace(/_page\d+\.png$/i, '').replace(/\.png$/i, '');

      for (let i = 1; i <= pdf.numPages; i++) {
        UT.showOverlay(`Rendering page ${i} / ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: quality });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const b64 = canvas.toDataURL('image/png').split(',')[1];
        await window.api.writeFile(`${prefix}_page${i}.png`, b64);
      }

      UT.hideOverlay();
      UT.showToast(`✅ Exported ${pdf.numPages} images`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_page1.png'), 300);
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
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});