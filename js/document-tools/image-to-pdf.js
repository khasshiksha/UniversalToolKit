// ============================================================
// Document Tools - Image to PDF
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('i2pBrowseBtn');
  if (!browseBtn) return;

  const files = [];
  const listEl = document.getElementById('i2pFileList');
  const dropZone = document.getElementById('i2pDropZone');
  const clearBtn = document.getElementById('i2pClearBtn');
  const runBtn = document.getElementById('i2pRunBtn');
  const options = document.getElementById('i2pOptions');
  const margin = document.getElementById('i2pMargin');
  const marginVal = document.getElementById('i2pMarginVal');
  let pageSize = 'fit';

  function render() {
    listEl.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <span class="file-num">${i + 1}</span>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-size">${UT.formatSize(f.size)}</div>
        </div>
        <button class="file-remove">✕</button>`;
      li.querySelector('.file-remove').addEventListener('click', () => {
        files.splice(i, 1);
        render();
      });
      listEl.appendChild(li);
    });
    runBtn.disabled = files.length === 0;
    options.style.display = files.length ? 'flex' : 'none';
  }

  function add(list) {
    list.forEach(f => {
      const low = f.name.toLowerCase();
      if (!(low.endsWith('.jpg') || low.endsWith('.jpeg') || low.endsWith('.png'))) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  }

  browseBtn.addEventListener('click', async () => {
    const res = await window.api.openMultiple([
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }
    ]);
    if (res.length) add(res);
  });

  clearBtn.addEventListener('click', () => {
    files.length = 0;
    render();
  });

  margin.addEventListener('input', () => {
    marginVal.textContent = margin.value + ' px';
  });

  UT.bindGroup('.pagesize-btn', b => { pageSize = b.dataset.ps; });

  runBtn.addEventListener('click', async () => {
    if (!files.length) return;
    UT.showOverlay('Creating PDF...');
    try {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.create();
      const m = +margin.value;

      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Adding image ${i + 1} / ${files.length}...`);
        const res = await window.api.readFile(files[i].path);
        if (!res.success) throw new Error(res.error);
        const bytes = UT.base64ToUint8(res.data);
        const low = files[i].name.toLowerCase();

        let img;
        if (low.endsWith('.png')) img = await doc.embedPng(bytes);
        else img = await doc.embedJpg(bytes);

        let pw, ph;
        if (pageSize === 'a4') { pw = 595; ph = 842; }
        else if (pageSize === 'letter') { pw = 612; ph = 792; }
        else { pw = img.width + m * 2; ph = img.height + m * 2; }

        const page = doc.addPage([pw, ph]);
        const availW = pw - m * 2;
        const availH = ph - m * 2;
        const s = Math.min(availW / img.width, availH / img.height);
        const w = img.width * s;
        const h = img.height * s;

        page.drawImage(img, {
          x: (pw - w) / 2,
          y: (ph - h) / 2,
          width: w,
          height: h
        });
      }

      const outBytes = await doc.save();
      const outPath = await window.api.saveFile({
        defaultName: 'images.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!outPath) { UT.hideOverlay(); return; }

      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();
      UT.showToast(`✅ Created PDF with ${files.length} images`, 'success');
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
    const list = Array.from(e.dataTransfer.files)
      .map(f => ({ path: f.path, name: f.name, size: f.size }));
    add(list);
  });

});