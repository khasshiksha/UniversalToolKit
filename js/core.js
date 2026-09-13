// ============================================================
// Universal Toolkit - Core Helpers & Navigation
// By RAM B SHAM
// ============================================================

// ============================================================
// Global namespace
// ============================================================
window.UT = window.UT || {};

// ============================================================
// ---------- UI Helpers ----------
// ============================================================

UT.formatSize = function(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

UT.showOverlay = function(text) {
  const el = document.getElementById('overlay');
  const txt = document.getElementById('overlayText');
  if (!el) return;
  if (txt) txt.textContent = text || 'Working...';
  el.classList.add('show');
};

UT.hideOverlay = function() {
  const el = document.getElementById('overlay');
  if (el) el.classList.remove('show');
};

UT.showToast = function(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s';
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// ============================================================
// ---------- Data helpers ----------
// ============================================================

UT.uint8ToBase64 = function(bytes) {
  let binary = '';
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

UT.base64ToUint8 = function(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

UT.sanitizeFilename = function(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.+$/, '')
    .substring(0, 150)
    .trim() || 'file';
};

UT.parsePageRanges = function(str, max) {
  const pages = new Set();
  str.split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(n => parseInt(n.trim(), 10));
      if (isNaN(a) || isNaN(b)) return;
      for (let i = a; i <= b; i++) if (i >= 1 && i <= max) pages.add(i - 1);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= max) pages.add(n - 1);
    }
  });
  return Array.from(pages).sort((a, b) => a - b);
};

// ============================================================
// ---------- URL title fetcher (uses yt-dlp) ----------
// ============================================================

UT.getUrlTitle = async function(url) {
  try {
    const res = await window.api.video.ytdlp(['--get-title', '--no-playlist', url]);
    if (res.success && res.stdout) {
      const lines = res.stdout.trim().split('\n').filter(Boolean);
      return lines[lines.length - 1] || 'video';
    }
  } catch (e) {}
  return 'video';
};

// ============================================================
// ---------- Image helpers ----------
// ============================================================

UT.loadImage = function(filePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await window.api.readFile(filePath);
      if (!res.success) return reject(new Error(res.error));
      const blob = new Blob([UT.base64ToUint8(res.data)]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = url;
    } catch (e) { reject(e); }
  });
};

UT.canvasToBase64 = function(canvas, format, quality) {
  return canvas.toDataURL(format, quality).split(',')[1];
};

// ============================================================
// ---------- File dialog helpers ----------
// ============================================================

// Ask user for a save path, then return the path WITHOUT extension
UT.pickPrefix = async function(defaultName) {
  const p = await window.api.saveFile({
    defaultName,
    filters: [{ name: 'Output', extensions: ['*'] }]
  });
  if (!p) return null;
  return p.replace(/\.[^./\\]+$/, '');
};

// ============================================================
// ---------- UI: Button group ----------
// ============================================================

UT.bindGroup = function(selector, cb) {
  document.querySelectorAll(selector).forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      cb(b);
    });
  });
};

// ============================================================
// ---------- Video progress ----------
// ============================================================

UT._videoProgressUnsub = null;

UT.setupVideoProgress = function(fillEl, textEl) {
  if (UT._videoProgressUnsub) UT._videoProgressUnsub();
  const wrap = fillEl.closest('.progress-wrap');
  if (wrap) wrap.style.display = 'block';
  fillEl.style.width = '0%';
  textEl.textContent = '0%';

  UT._videoProgressUnsub = window.api.video.onProgress((data) => {
    if (data.percent !== undefined) {
      fillEl.style.width = data.percent + '%';
      textEl.textContent = data.percent.toFixed(1) + '%';
    } else if (data.h !== undefined) {
      const t = `${String(data.h).padStart(2,'0')}:${String(data.m).padStart(2,'0')}:${String(Math.floor(data.s)).padStart(2,'0')}`;
      textEl.textContent = t;
    }
  });
};

UT.hideVideoProgress = function(fillEl) {
  const wrap = fillEl ? fillEl.closest('.progress-wrap') : null;
  if (wrap) setTimeout(() => { wrap.style.display = 'none'; }, 800);
  if (UT._videoProgressUnsub) {
    UT._videoProgressUnsub();
    UT._videoProgressUnsub = null;
  }
};

// ============================================================
// ---------- Constants ----------
// ============================================================

UT.VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v', 'wmv', '3gp'];
UT.IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

// ============================================================
// ---------- Image Manager (shared by image tools) ----------
// ============================================================
// cfg = {
//   listEl, browseBtn, clearBtn, runBtn, optionsEl, dropZone
// }
// returns { get, render, add, clear }

UT.makeImageManager = function(cfg) {
  const files = [];

  const render = () => {
    if (!cfg.listEl) return;
    cfg.listEl.innerHTML = '';
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
        files.splice(i, 1);
        render();
      });
      cfg.listEl.appendChild(li);
    });
    if (cfg.runBtn) cfg.runBtn.disabled = files.length === 0;
    if (cfg.optionsEl) cfg.optionsEl.style.display = files.length ? 'flex' : 'none';
  };

  const add = (list) => {
    list.forEach(f => {
      const low = f.name.toLowerCase();
      const ok = UT.IMG_EXTS.some(e => low.endsWith('.' + e));
      if (!ok) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  };

  const clear = () => {
    files.length = 0;
    render();
  };

  if (cfg.browseBtn) {
    cfg.browseBtn.addEventListener('click', async () => {
      const res = await window.api.openMultiple([
        { name: 'Images', extensions: UT.IMG_EXTS }
      ]);
      if (res.length) add(res);
    });
  }

  if (cfg.clearBtn) cfg.clearBtn.addEventListener('click', clear);

  if (cfg.dropZone) {
    cfg.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      cfg.dropZone.classList.add('drag-over');
    });
    cfg.dropZone.addEventListener('dragleave', () => {
      cfg.dropZone.classList.remove('drag-over');
    });
    cfg.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      cfg.dropZone.classList.remove('drag-over');
      const list = Array.from(e.dataTransfer.files)
        .map(f => ({ path: f.path, name: f.name, size: f.size }));
      add(list);
    });
  }

  return { get: () => files, render, add, clear };
};

// ============================================================
// ---------- Video Loader (single file) ----------
// ============================================================
// prefix = e.g. 'vc' -> looks for vcDropZone, vcBrowseBtn,
// vcInfo, vcFileName, vcFileSize, vcClearBtn, vcRunBtn, vcOptions
// returns { getFile, setFile, runBtn }

UT.makeVideoLoader = function(prefix, exts) {
  let file = null;
  const dropZone = document.getElementById(prefix + 'DropZone');
  const browseBtn = document.getElementById(prefix + 'BrowseBtn');
  const info = document.getElementById(prefix + 'Info');
  const nameEl = document.getElementById(prefix + 'FileName');
  const sizeEl = document.getElementById(prefix + 'FileSize');
  const clearBtn = document.getElementById(prefix + 'ClearBtn');
  const runBtn = document.getElementById(prefix + 'RunBtn');
  const optionsEl = document.getElementById(prefix + 'Options');

  function setFile(f) {
    file = f;
    if (nameEl) nameEl.textContent = f.name;
    if (sizeEl) sizeEl.textContent = UT.formatSize(f.size);
    if (info) info.style.display = 'block';
    if (optionsEl) optionsEl.style.display = 'flex';
    if (runBtn) runBtn.disabled = false;
  }

  if (browseBtn) {
    browseBtn.addEventListener('click', async () => {
      const f = await window.api.openSingle([
        { name: 'Videos', extensions: exts }
      ]);
      if (f) setFile(f);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      file = null;
      if (info) info.style.display = 'none';
      if (optionsEl) optionsEl.style.display = 'none';
      if (runBtn) runBtn.disabled = true;
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const f = Array.from(e.dataTransfer.files).find(x =>
        exts.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
      if (f) setFile({ path: f.path, name: f.name, size: f.size });
    });
  }

  return {
    getFile: () => file,
    setFile,
    runBtn
  };
};

// ============================================================
// ---------- PDF.js init ----------
// ============================================================

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
}

// ============================================================
// ---------- Navigation ----------
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Sidebar: collapsible groups ----------
  document.querySelectorAll('.nav-group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const group = header.closest('.nav-group');
      if (!group) return;
      if (group.classList.contains('disabled')) {
        UT.showToast('🔒 यो feature अझै आएको छैन', 'warning');
        return;
      }
      group.classList.toggle('open');
    });
  });

  // ---------- Tool switching ----------
  const toolPanels = document.querySelectorAll('.tool-panel');
  const navButtons = document.querySelectorAll('.nav-btn[data-tool]');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tool = btn.dataset.tool;
      const panel = document.getElementById('tool-' + tool) ||
                    document.getElementById('tool-coming-soon');

      toolPanels.forEach(p => p.classList.remove('active'));
      if (panel) panel.classList.add('active');
    });
  });

});