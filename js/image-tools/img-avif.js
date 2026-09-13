// ============================================================
// Image Tools - AVIF Converter
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  function browserSupportsFormat(mime) {
    try {
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      return c.toDataURL(mime).startsWith('data:' + mime);
    } catch (e) { return false; }
  }
  const SUPPORTS_AVIF = browserSupportsFormat('image/avif');

  const browseBtn = document.getElementById('avifBrowseBtn');
  if (!browseBtn) return;

  const files = [];
  const listEl = document.getElementById('avifList');
  const dropZone = document.getElementById('avifDropZone');
  const clearBtn = document.getElementById('avifClearBtn');
  const runBtn = document.getElementById('avifRunBtn');
  const optionsEl = document.getElementById('avifOptions');
  const qualityEl = document.getElementById('avifQuality');
  const qualityValEl = document.getElementById('avifQualityVal');

  let outFormat = 'image/avif';
  let outQuality = 80;

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
      if (!['.jpg', '.jpeg', '.png', '.webp', '.avif'].some(e => low.endsWith(e))) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  }

  browseBtn.addEventListener('click', async () => {
    const res = await window.api.openMultiple([
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] }
    ]);
    if (res.length) add(res);
  });
  clearBtn.addEventListener('click', () => { files.length = 0; render(); });

  UT.bindGroup('.avif-fmt-btn', b => { outFormat = b.dataset.fmt; });

  qualityEl.addEventListener('input', () => {
    outQuality = +qualityEl.value;
    qualityValEl.textContent = outQuality + '%';
  });

  runBtn.addEventListener('click', async () => {
    if (!files.length) return;
    if (outFormat === 'image/avif' && !SUPPORTS_AVIF) {
      UT.showToast('❌ AVIF encoding not supported. Try WEBP.', 'error');
      return;
    }
    const ext = outFormat === 'image/avif' ? '.avif'
              : outFormat === 'image/webp' ? '.webp'
              : outFormat === 'image/jpeg' ? '.jpg' : '.png';
    const prefix = await UT.pickPrefix('converted_1' + ext);
    if (!prefix) return;
    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Converting ${i + 1} / ${files.length}...`);
        const { img, url } = await UT.loadImage(files[i].path);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (outFormat === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const b64 = c.toDataURL(outFormat, outQuality / 100).split(',')[1];
        await window.api.writeFile(`${prefix}_${i + 1}${ext}`, b64);
      }
      UT.hideOverlay();
      UT.showToast(`✅ Converted ${files.length} image(s)`, 'success');
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