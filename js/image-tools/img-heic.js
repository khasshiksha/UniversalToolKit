// ============================================================
// Image Tools - HEIC Converter
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('heicBrowseBtn');
  if (!browseBtn) return;

  const files = [];
  const listEl = document.getElementById('heicList');
  const dropZone = document.getElementById('heicDropZone');
  const clearBtn = document.getElementById('heicClearBtn');
  const runBtn = document.getElementById('heicRunBtn');
  const optionsEl = document.getElementById('heicOptions');
  const qualityEl = document.getElementById('heicQuality');
  const qualityValEl = document.getElementById('heicQualityVal');

  let outFormat = 'image/jpeg';
  let outQuality = 90;

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
        files.splice(i, 1); render();
      });
      listEl.appendChild(li);
    });
    runBtn.disabled = files.length === 0;
    optionsEl.style.display = files.length ? 'flex' : 'none';
  }

  function add(list) {
    list.forEach(f => {
      const low = f.name.toLowerCase();
      if (!(low.endsWith('.heic') || low.endsWith('.heif'))) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  }

  browseBtn.addEventListener('click', async () => {
    const res = await window.api.openMultiple([
      { name: 'HEIC Files', extensions: ['heic', 'heif'] }
    ]);
    if (res.length) add(res);
  });
  clearBtn.addEventListener('click', () => { files.length = 0; render(); });

  UT.bindGroup('.heic-fmt-btn', b => { outFormat = b.dataset.fmt; });

  qualityEl.addEventListener('input', () => {
    outQuality = +qualityEl.value;
    qualityValEl.textContent = outQuality + '%';
  });

  runBtn.addEventListener('click', async () => {
    if (!files.length) return;
    if (!window.heic2any) {
      UT.showToast('❌ heic2any library not loaded', 'error');
      return;
    }
    const ext = outFormat === 'image/jpeg' ? '.jpg' : '.png';
    const prefix = await UT.pickPrefix('converted_1' + ext);
    if (!prefix) return;
    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Converting HEIC ${i + 1} / ${files.length}...`);
        const res = await window.api.readFile(files[i].path);
        const blob = new Blob([UT.base64ToUint8(res.data)], { type: 'image/heic' });
        const converted = await heic2any({
          blob: blob,
          toType: outFormat,
          quality: outQuality / 100
        });
        const outBlob = Array.isArray(converted) ? converted[0] : converted;
        const arrayBuf = await outBlob.arrayBuffer();
        await window.api.writeFile(`${prefix}_${i + 1}${ext}`,
          UT.uint8ToBase64(new Uint8Array(arrayBuf)));
      }
      UT.hideOverlay();
      UT.showToast(`✅ Converted ${files.length} HEIC file(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1' + ext), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const list = Array.from(e.dataTransfer.files)
      .map(f => ({ path: f.path, name: f.name, size: f.size }));
    add(list);
  });

});