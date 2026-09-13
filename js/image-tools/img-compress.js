// ============================================================
// Image Tools - Compress
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mgr = UT.makeImageManager({
    listEl: document.getElementById('imgCompList'),
    browseBtn: document.getElementById('imgCompBrowseBtn'),
    clearBtn: document.getElementById('imgCompClearBtn'),
    runBtn: document.getElementById('imgCompRunBtn'),
    optionsEl: document.getElementById('imgCompOptions'),
    dropZone: document.getElementById('imgCompDropZone')
  });
  const runBtn = document.getElementById('imgCompRunBtn');
  if (!runBtn) return;

  let quality = 75;
  UT.bindGroup('.lvl-btn', b => { quality = +b.dataset.lvl; });

  runBtn.addEventListener('click', async () => {
    const files = mgr.get();
    if (!files.length) return;
    const prefix = await UT.pickPrefix('compressed_1.jpg');
    if (!prefix) return;
    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Compressing ${i + 1} / ${files.length}...`);
        const { img, url } = await UT.loadImage(files[i].path);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        await window.api.writeFile(`${prefix}_${i + 1}.jpg`,
          UT.canvasToBase64(c, 'image/jpeg', quality / 100));
      }
      UT.hideOverlay();
      UT.showToast(`✅ Compressed ${files.length} image(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1.jpg'), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});