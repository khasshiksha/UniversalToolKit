// ============================================================
// Document Tools - PDF Watermark
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('watermarkBrowseBtn');
  if (!browseBtn) return;

  let file = null;
  let totalPages = 0;
  let pos = 'center';
  let size = 'medium';

  const dropZone = document.getElementById('watermarkDropZone');
  const clearBtn = document.getElementById('watermarkClearBtn');
  const runBtn = document.getElementById('watermarkRunBtn');
  const info = document.getElementById('watermarkInfo');
  const options = document.getElementById('watermarkOptions');
  const fileNameEl = document.getElementById('watermarkFileName');
  const pageCountEl = document.getElementById('watermarkPageCount');
  const textInput = document.getElementById('watermarkText');
  const opacity = document.getElementById('watermarkOpacity');
  const opacityVal = document.getElementById('watermarkOpacityVal');

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
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(UT.base64ToUint8(res.data));

      file = f;
      totalPages = doc.getPageCount();
      fileNameEl.textContent = f.name;
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

  opacity.addEventListener('input', () => {
    opacityVal.textContent = opacity.value + '%';
  });

  UT.bindGroup('.pos-btn', b => { pos = b.dataset.pos; });
  UT.bindGroup('.size-btn', b => { size = b.dataset.size; });

  runBtn.addEventListener('click', async () => {
    if (!file) return;
    const text = textInput.value.trim();
    if (!text) {
      UT.showToast('⚠️ Please enter watermark text', 'warning');
      return;
    }
    const op = +opacity.value / 100;

    try {
      const res = await window.api.readFile(file.path);
      const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
      const doc = await PDFDocument.load(UT.base64ToUint8(res.data));
      const font = await doc.embedFont(StandardFonts.HelveticaBold);

      UT.showOverlay('Adding watermark...');
      doc.getPages().forEach(page => {
        const { width, height } = page.getSize();

        let fontSize;
        if (size === 'small') fontSize = Math.min(width, height) * 0.05;
        else if (size === 'large') fontSize = Math.min(width, height) * 0.13;
        else fontSize = Math.min(width, height) * 0.09;

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x, y, rotate = 0;
        if (pos === 'center') {
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
        } else if (pos === 'diagonal') {
          rotate = 45;
          const rad = Math.PI / 4;
          x = width / 2 - (textWidth / 2) * Math.cos(rad) + (textHeight / 2) * Math.sin(rad);
          y = height / 2 - (textWidth / 2) * Math.sin(rad) - (textHeight / 2) * Math.cos(rad);
        } else {
          fontSize = Math.min(fontSize, 30);
          const w = font.widthOfTextAtSize(text, fontSize);
          x = (width - w) / 2;
          y = 20;
        }

        page.drawText(text, {
          x, y,
          size: fontSize,
          font,
          color: rgb(0.4, 0.4, 0.9),
          opacity: op,
          rotate: degrees(rotate)
        });
      });

      const outPath = await window.api.saveFile({
        defaultName: file.name.replace(/\.pdf$/i, '_watermarked.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!outPath) { UT.hideOverlay(); return; }

      const outBytes = await doc.save();
      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();
      UT.showToast(`✅ Watermark added to ${totalPages} pages`, 'success');
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
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});