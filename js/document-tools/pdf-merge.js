// ============================================================
// Document Tools - PDF Merge
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mergeFileList = document.getElementById('mergeFileList');
  if (!mergeFileList) return;

  const mergeFiles = [];
  const mergeRunBtn = document.getElementById('mergeRunBtn');
  const mergeClearBtn = document.getElementById('mergeClearBtn');
  const mergeBrowseBtn = document.getElementById('mergeBrowseBtn');
  const mergeDropZone = document.getElementById('mergeDropZone');

  function renderList() {
    mergeFileList.innerHTML = '';
    mergeFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.draggable = true;
      li.innerHTML = `
        <span class="file-handle">☰</span>
        <span class="file-num">${index + 1}</span>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${UT.formatSize(file.size)}</div>
        </div>
        <button class="file-remove">✕</button>`;
      li.querySelector('.file-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        mergeFiles.splice(index, 1);
        renderList();
      });
      li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', index);
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        li.classList.add('drag-target');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-target'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-target');
        const from = +e.dataTransfer.getData('text/plain');
        if (from === index) return;
        const [moved] = mergeFiles.splice(from, 1);
        mergeFiles.splice(index, 0, moved);
        renderList();
      });
      mergeFileList.appendChild(li);
    });
    mergeRunBtn.disabled = mergeFiles.length < 2;
  }

  function addFiles(list) {
    list.forEach(fp => {
      if (!fp.path.toLowerCase().endsWith('.pdf')) return;
      if (mergeFiles.some(f => f.path === fp.path)) return;
      mergeFiles.push(fp);
    });
    renderList();
  }

  mergeBrowseBtn.addEventListener('click', async () => {
    const files = await window.api.openMultiple([
      { name: 'PDF Files', extensions: ['pdf'] }
    ]);
    if (files.length) addFiles(files);
  });

  mergeClearBtn.addEventListener('click', () => {
    mergeFiles.length = 0;
    renderList();
  });

  mergeRunBtn.addEventListener('click', async () => {
    if (mergeFiles.length < 2) return;

    const outPath = await window.api.saveFile({
      defaultName: 'merged.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!outPath) return;

    UT.showOverlay('Merging PDFs...');
    try {
      const { PDFDocument } = PDFLib;
      const merged = await PDFDocument.create();
      for (let i = 0; i < mergeFiles.length; i++) {
        UT.showOverlay(`Merging PDF ${i + 1} / ${mergeFiles.length}...`);
        const res = await window.api.readFile(mergeFiles[i].path);
        if (!res.success) throw new Error(res.error);
        const doc = await PDFDocument.load(UT.base64ToUint8(res.data));
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const outBytes = await merged.save();
      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();
      UT.showToast('✅ Merged successfully!', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
      mergeFiles.length = 0;
      renderList();
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  mergeDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    mergeDropZone.classList.add('drag-over');
  });
  mergeDropZone.addEventListener('dragleave', () => {
    mergeDropZone.classList.remove('drag-over');
  });
  mergeDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    mergeDropZone.classList.remove('drag-over');
    const list = Array.from(e.dataTransfer.files)
      .filter(f => f.name.toLowerCase().endsWith('.pdf'))
      .map(f => ({ path: f.path, name: f.name, size: f.size }));
    if (list.length) addFiles(list);
  });

});