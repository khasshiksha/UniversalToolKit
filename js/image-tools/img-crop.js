// ============================================================
// Image Tools - Crop
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('cropBrowseBtn');
  if (!browseBtn) return;

  const dropZone = document.getElementById('cropDropZone');
  const workspace = document.getElementById('cropWorkspace');
  const canvas = document.getElementById('cropCanvas');
  const clearBtn = document.getElementById('cropClearBtn');
  const runBtn = document.getElementById('cropRunBtn');
  const selInfo = document.getElementById('cropSelInfo');

  let img = null, imgName = '', sel = null;
  let dragging = false, dragStart = null;
  let ratio = 0;

  function drawCanvas() {
    if (!img) return;
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    if (sel) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      ctx.drawImage(img, sel.x, sel.y, sel.w, sel.h, sel.x, sel.y, sel.w, sel.h);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = Math.max(2, canvas.width / 400);
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      const hs = Math.max(6, canvas.width / 100);
      ctx.fillStyle = '#6366f1';
      [[sel.x, sel.y], [sel.x + sel.w - hs, sel.y],
       [sel.x, sel.y + sel.h - hs], [sel.x + sel.w - hs, sel.y + sel.h - hs]]
        .forEach(([hx, hy]) => ctx.fillRect(hx, hy, hs, hs));
    }
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function updateSelInfo() {
    if (!sel) { selInfo.textContent = '—'; return; }
    selInfo.textContent = `${Math.round(sel.w)} × ${Math.round(sel.h)} px`;
  }

  async function loadFile(file) {
    const low = file.name.toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].some(e => low.endsWith(e))) {
      UT.showToast('Please choose JPG/PNG/WEBP', 'warning');
      return;
    }
    const { img: loaded, url } = await UT.loadImage(file.path);
    URL.revokeObjectURL(url);
    img = loaded;
    imgName = file.name;
    sel = null;
    workspace.style.display = 'block';
    runBtn.disabled = true;
    drawCanvas();
    updateSelInfo();
  }

  browseBtn.addEventListener('click', async () => {
    const file = await window.api.openSingle([
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]);
    if (file) loadFile(file);
  });

  clearBtn.addEventListener('click', () => {
    img = null; sel = null;
    workspace.style.display = 'none';
    runBtn.disabled = true;
  });

  UT.bindGroup('.crop-quick-btn', b => { ratio = +b.dataset.ratio; });

  canvas.addEventListener('mousedown', (e) => {
    if (!img) return;
    const c = canvasCoords(e);
    dragging = true;
    dragStart = c;
    sel = { x: c.x, y: c.y, w: 0, h: 0 };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!dragging || !dragStart) return;
    const c = canvasCoords(e);
    let w = c.x - dragStart.x;
    let h = c.y - dragStart.y;
    if (ratio > 0) {
      if (Math.abs(w) / ratio > Math.abs(h)) h = Math.sign(h || 1) * Math.abs(w) / ratio;
      else w = Math.sign(w || 1) * Math.abs(h) * ratio;
    }
    sel.x = w < 0 ? dragStart.x + w : dragStart.x;
    sel.y = h < 0 ? dragStart.y + h : dragStart.y;
    sel.w = Math.abs(w);
    sel.h = Math.abs(h);
    sel.x = Math.max(0, sel.x);
    sel.y = Math.max(0, sel.y);
    sel.w = Math.min(sel.w, canvas.width - sel.x);
    sel.h = Math.min(sel.h, canvas.height - sel.y);
    drawCanvas();
    updateSelInfo();
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    dragStart = null;
    if (sel && sel.w > 5 && sel.h > 5) runBtn.disabled = false;
    else { sel = null; runBtn.disabled = true; drawCanvas(); updateSelInfo(); }
  });

  runBtn.addEventListener('click', async () => {
    if (!img || !sel) return;
    const out = document.createElement('canvas');
    out.width = Math.round(sel.w);
    out.height = Math.round(sel.h);
    const ctx = out.getContext('2d');
    ctx.drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, out.width, out.height);
    const outPath = await window.api.saveFile({
      defaultName: imgName.replace(/\.[^.]+$/, '_cropped.png'),
      filters: [{ name: 'PNG', extensions: ['png'] }]
    });
    if (!outPath) return;
    await window.api.writeFile(outPath, out.toDataURL('image/png').split(',')[1]);
    UT.showToast('✅ Crop saved', 'success');
    setTimeout(() => window.api.showInFolder(outPath), 300);
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});