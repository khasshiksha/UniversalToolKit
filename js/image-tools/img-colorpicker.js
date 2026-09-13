// ============================================================
// Image Tools - Color Picker
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('cpBrowseBtn');
  if (!browseBtn) return;

  const dropZone = document.getElementById('cpDropZone');
  const workspace = document.getElementById('cpWorkspace');
  const canvas = document.getElementById('cpCanvas');
  const clearBtn = document.getElementById('cpClearBtn');
  const resetBtn = document.getElementById('cpResetBtn');
  const swatch = document.getElementById('cpSwatch');
  const hexEl = document.getElementById('cpHex');
  const rgbEl = document.getElementById('cpRgb');
  const hslEl = document.getElementById('cpHsl');

  let img = null;

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function toHex(n) { return n.toString(16).padStart(2, '0').toUpperCase(); }

  async function loadFile(file) {
    const low = file.name.toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].some(e => low.endsWith(e))) {
      UT.showToast('Please choose JPG/PNG/WEBP', 'warning');
      return;
    }
    const { img: loaded, url } = await UT.loadImage(file.path);
    URL.revokeObjectURL(url);
    img = loaded;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    workspace.style.display = 'block';
    resetBtn.disabled = false;
    swatch.style.background = '#333';
    hexEl.textContent = '—';
    rgbEl.textContent = '—';
    hslEl.textContent = '—';
  }

  browseBtn.addEventListener('click', async () => {
    const file = await window.api.openSingle([
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]);
    if (file) loadFile(file);
  });

  clearBtn.addEventListener('click', () => {
    img = null;
    workspace.style.display = 'none';
    resetBtn.disabled = true;
  });

  resetBtn.addEventListener('click', () => {
    swatch.style.background = '#333';
    hexEl.textContent = '—';
    rgbEl.textContent = '—';
    hslEl.textContent = '—';
  });

  canvas.addEventListener('click', (e) => {
    if (!img) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    const data = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    const r = data[0], g = data[1], b = data[2];
    const hex = '#' + toHex(r) + toHex(g) + toHex(b);
    const [h, s, l] = rgbToHsl(r, g, b);
    swatch.style.background = hex;
    hexEl.textContent = hex;
    rgbEl.textContent = `rgb(${r}, ${g}, ${b})`;
    hslEl.textContent = `hsl(${h}, ${s}%, ${l}%)`;
  });

  document.querySelectorAll('.cp-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target || target.textContent === '—') return;
      navigator.clipboard.writeText(target.textContent);
      UT.showToast('📋 Copied: ' + target.textContent, 'success');
    });
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

});