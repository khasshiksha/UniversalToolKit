// ============================================================
// Image Tools - Rotate / Flip
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mgr = UT.makeImageManager({
    listEl: document.getElementById('imgRotList'),
    browseBtn: document.getElementById('imgRotBrowseBtn'),
    clearBtn: document.getElementById('imgRotClearBtn'),
    runBtn: document.getElementById('imgRotRunBtn'),
    optionsEl: document.getElementById('imgRotOptions'),
    dropZone: document.getElementById('imgRotDropZone')
  });
  const runBtn = document.getElementById('imgRotRunBtn');
  if (!runBtn) return;

  let action = 'rotate90';
  UT.bindGroup('.ract-btn', b => { action = b.dataset.act; });

  runBtn.addEventListener('click', async () => {
    const files = mgr.get();
    if (!files.length) return;
    const prefix = await UT.pickPrefix('rotated_1.jpg');
    if (!prefix) return;
    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Processing ${i + 1} / ${files.length}...`);
        const { img, url } = await UT.loadImage(files[i].path);
        const w = img.naturalWidth, h = img.naturalHeight;
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (action === 'rotate90' || action === 'rotate270') {
          c.width = h; c.height = w;
        } else {
          c.width = w; c.height = h;
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.save();
        if (action === 'rotate90') { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); }
        else if (action === 'rotate180') { ctx.translate(c.width, c.height); ctx.rotate(Math.PI); }
        else if (action === 'rotate270') { ctx.translate(0, c.height); ctx.rotate(-Math.PI / 2); }
        else if (action === 'flipH') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        else if (action === 'flipV') { ctx.translate(0, c.height); ctx.scale(1, -1); }
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        URL.revokeObjectURL(url);
        await window.api.writeFile(`${prefix}_${i + 1}.jpg`,
          UT.canvasToBase64(c, 'image/jpeg', 0.92));
      }
      UT.hideOverlay();
      UT.showToast(`✅ Processed ${files.length} image(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1.jpg'), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});