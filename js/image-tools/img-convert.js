// ============================================================
// Image Tools - Convert Format
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mgr = UT.makeImageManager({
    listEl: document.getElementById('imgConvList'),
    browseBtn: document.getElementById('imgConvBrowseBtn'),
    clearBtn: document.getElementById('imgConvClearBtn'),
    runBtn: document.getElementById('imgConvRunBtn'),
    optionsEl: document.getElementById('imgConvOptions'),
    dropZone: document.getElementById('imgConvDropZone')
  });
  const runBtn = document.getElementById('imgConvRunBtn');
  if (!runBtn) return;

  let format = 'image/jpeg';
  let quality = 90;

  UT.bindGroup('.fmt-btn', b => { format = b.dataset.fmt; });
  const qEl = document.getElementById('imgConvQuality');
  if (qEl) qEl.addEventListener('input', (e) => {
    quality = +e.target.value;
    document.getElementById('imgConvQualityVal').textContent = quality + '%';
  });

  runBtn.addEventListener('click', async () => {
    const files = mgr.get();
    if (!files.length) return;
    const ext = format === 'image/jpeg' ? '.jpg'
              : format === 'image/png' ? '.png' : '.webp';
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
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        await window.api.writeFile(`${prefix}_${i + 1}${ext}`,
          UT.canvasToBase64(c, format, quality / 100));
      }
      UT.hideOverlay();
      UT.showToast(`✅ Converted ${files.length} image(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1' + ext), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});