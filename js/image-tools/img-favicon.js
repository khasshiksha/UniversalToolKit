// ============================================================
// Image Tools - Favicon Generator
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('favBrowseBtn');
  if (!browseBtn) return;

  const dropZone = document.getElementById('favDropZone');
  const info = document.getElementById('favInfo');
  const options = document.getElementById('favOptions');
  const fileNameEl = document.getElementById('favFileName');
  const origSizeEl = document.getElementById('favOrigSize');
  const clearBtn = document.getElementById('favClearBtn');
  const runBtn = document.getElementById('favRunBtn');

  let img = null, baseName = 'image';

  async function loadFile(file) {
    const low = file.name.toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].some(e => low.endsWith(e))) {
      UT.showToast('Please choose an image', 'warning');
      return;
    }
    const { img: loaded, url } = await UT.loadImage(file.path);
    URL.revokeObjectURL(url);
    img = loaded;
    baseName = file.name.replace(/\.[^.]+$/, '');
    fileNameEl.textContent = file.name;
    origSizeEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    info.style.display = 'block';
    options.style.display = 'flex';
    runBtn.disabled = false;
  }

  browseBtn.addEventListener('click', async () => {
    const file = await window.api.openSingle([
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }
    ]);
    if (file) loadFile(file);
  });

  clearBtn.addEventListener('click', () => {
    img = null;
    info.style.display = 'none';
    options.style.display = 'none';
    runBtn.disabled = true;
  });

  runBtn.addEventListener('click', async () => {
    if (!img) return;
    const sizes = Array.from(document.querySelectorAll('.fav-size-cb'))
      .filter(cb => cb.checked).map(cb => +cb.value);
    if (!sizes.length) { UT.showToast('⚠️ Select at least one size', 'warning'); return; }
    const makeSquare = document.getElementById('favSquare').checked;

    const outPath = await window.api.saveFile({
      defaultName: `${baseName}_favicon_16x16.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }]
    });
    if (!outPath) return;
    const prefix = outPath.replace(/_\d+x\d+\.png$/i, '').replace(/\.png$/i, '');

    try {
      for (const size of sizes) {
        UT.showOverlay(`Generating ${size}×${size}...`);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (makeSquare) {
          const srcW = img.naturalWidth, srcH = img.naturalHeight;
          const side = Math.min(srcW, srcH);
          const sx = (srcW - side) / 2;
          const sy = (srcH - side) / 2;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        } else {
          const ar = img.naturalWidth / img.naturalHeight;
          let w = size, h = size;
          if (ar > 1) h = Math.round(size / ar);
          else w = Math.round(size * ar);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        }
        await window.api.writeFile(`${prefix}_favicon_${size}x${size}.png`,
          canvas.toDataURL('image/png').split(',')[1]);
      }
      UT.hideOverlay();
      UT.showToast(`✅ Generated ${sizes.length} favicon size(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_favicon_16x16.png'), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});