// ============================================================
// Document Tools - PDF Rotate
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const rotateBrowseBtn = document.getElementById('rotateBrowseBtn');
  if (!rotateBrowseBtn) return;

  let rotateFile = null;
  let rotateTotalPages = 0;
  let rotateAngle = 90;

  const rotateDropZone = document.getElementById('rotateDropZone');
  const rotateClearBtn = document.getElementById('rotateClearBtn');
  const rotateRunBtn = document.getElementById('rotateRunBtn');
  const rotateInfo = document.getElementById('rotateInfo');
  const rotateOptions = document.getElementById('rotateOptions');
  const rotateFileName = document.getElementById('rotateFileName');
  const rotatePageCount = document.getElementById('rotatePageCount');
  const rotatePagesInput = document.getElementById('rotatePagesInput');

  rotateBrowseBtn.addEventListener('click', async () => {
    const file = await window.api.openSingle([
      { name: 'PDF Files', extensions: ['pdf'] }
    ]);
    if (file) loadFile(file);
  });

  async function loadFile(file) {
    if (!file.path.toLowerCase().endsWith('.pdf')) return;
    UT.showOverlay('Loading PDF...');
    try {
      const res = await window.api.readFile(file.path);
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(UT.base64ToUint8(res.data));

      rotateFile = file;
      rotateTotalPages = doc.getPageCount();
      rotateFileName.textContent = file.name;
      rotatePageCount.textContent = rotateTotalPages;
      rotateInfo.style.display = 'block';
      rotateOptions.style.display = 'flex';
      rotateRunBtn.disabled = false;
      UT.hideOverlay();
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  }

  rotateClearBtn.addEventListener('click', () => {
    rotateFile = null;
    rotateTotalPages = 0;
    rotateInfo.style.display = 'none';
    rotateOptions.style.display = 'none';
    rotateRunBtn.disabled = true;
    rotatePagesInput.value = '';
  });

  UT.bindGroup('.angle-btn', b => { rotateAngle = +b.dataset.angle; });

  rotateRunBtn.addEventListener('click', async () => {
    if (!rotateFile) return;
    const mode = document.querySelector('input[name="rotateApply"]:checked').value;

    try {
      const res = await window.api.readFile(rotateFile.path);
      const { PDFDocument, degrees } = PDFLib;
      const doc = await PDFDocument.load(UT.base64ToUint8(res.data));

      let pageIndices;
      if (mode === 'all') {
        pageIndices = doc.getPageIndices();
      } else {
        pageIndices = UT.parsePageRanges(rotatePagesInput.value, rotateTotalPages);
        if (!pageIndices.length) {
          UT.showToast('⚠️ Enter valid page numbers', 'warning');
          return;
        }
      }

      UT.showOverlay('Rotating pages...');
      pageIndices.forEach(i => {
        const page = doc.getPage(i);
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + rotateAngle) % 360));
      });

      const outPath = await window.api.saveFile({
        defaultName: rotateFile.name.replace(/\.pdf$/i, '_rotated.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!outPath) { UT.hideOverlay(); return; }

      const outBytes = await doc.save();
      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();
      UT.showToast(`✅ Rotated ${pageIndices.length} pages by ${rotateAngle}°`, 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  rotateDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    rotateDropZone.classList.add('drag-over');
  });
  rotateDropZone.addEventListener('dragleave', () => {
    rotateDropZone.classList.remove('drag-over');
  });
  rotateDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    rotateDropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      x.name.toLowerCase().endsWith('.pdf'));
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});