// ============================================================
// Image Tools - Resize
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mgr = UT.makeImageManager({
    listEl: document.getElementById('imgResList'),
    browseBtn: document.getElementById('imgResBrowseBtn'),
    clearBtn: document.getElementById('imgResClearBtn'),
    runBtn: document.getElementById('imgResRunBtn'),
    optionsEl: document.getElementById('imgResOptions'),
    dropZone: document.getElementById('imgResDropZone')
  });
  const runBtn = document.getElementById('imgResRunBtn');
  if (!runBtn) return;

  let mode = 'percent';
  let percent = 100;

  UT.bindGroup('.rmode-btn', b => {
    mode = b.dataset.mode;
    document.getElementById('imgResPercentRow').style.display =
      mode === 'percent' ? 'flex' : 'none';
    document.getElementById('imgResPixelsRow').style.display =
      mode === 'pixels' ? 'flex' : 'none';
  });

  UT.bindGroup('.pct-btn', b => { percent = +b.dataset.pct; });

  runBtn.addEventListener('click', async () => {
    const files = mgr.get();
    if (!files.length) return;
    let targetW = 0, targetH = 0;
    if (mode === 'pixels') {
      targetW = +document.getElementById('imgResW').value;
      targetH = +document.getElementById('imgResH').value;
      if (!targetW || !targetH) {
        UT.showToast('⚠️ Enter width and height', 'warning');
        return;
      }
    }
    const prefix = await UT.pickPrefix('resized_1.jpg');
    if (!prefix) return;
    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Resizing ${i + 1} / ${files.length}...`);
        const { img, url } = await UT.loadImage(files[i].path);
        const ow = img.naturalWidth, oh = img.naturalHeight;
        let nw, nh;
        if (mode === 'percent') {
          nw = Math.round(ow * percent / 100);
          nh = Math.round(oh * percent / 100);
        } else {
          nw = targetW; nh = targetH;
          if (document.getElementById('imgResLockAR').checked) {
            const ar = ow / oh;
            if (nw / nh > ar) nw = Math.round(nh * ar);
            else nh = Math.round(nw / ar);
          }
        }
        const c = document.createElement('canvas');
        c.width = nw; c.height = nh;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, nw, nh);
        URL.revokeObjectURL(url);
        await window.api.writeFile(`${prefix}_${i + 1}.jpg`,
          UT.canvasToBase64(c, 'image/jpeg', 0.92));
      }
      UT.hideOverlay();
      UT.showToast(`✅ Resized ${files.length} image(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1.jpg'), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});