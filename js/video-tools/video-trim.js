// ============================================================
// Video Tools - Trim / Cut
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('vtrimBrowseBtn');
  if (!browseBtn) return;

  let videoFile = null;
  let videoDuration = 0;
  let previewUrl = null;

  const dropZone = document.getElementById('vtrimDropZone');
  const workspace = document.getElementById('vtrimWorkspace');
  const preview = document.getElementById('vtrimPreview');
  const startRange = document.getElementById('vtrimStartRange');
  const endRange = document.getElementById('vtrimEndRange');
  const startInput = document.getElementById('vtrimStart');
  const endInput = document.getElementById('vtrimEnd');
  const durationEl = document.getElementById('vtrimDuration');
  const clearBtn = document.getElementById('vtrimClearBtn');
  const runBtn = document.getElementById('vtrimRunBtn');
  const setStartBtn = document.getElementById('vtrimSetStart');
  const setEndBtn = document.getElementById('vtrimSetEnd');
  const resetBtn = document.getElementById('vtrimReset');
  const playSelBtn = document.getElementById('vtrimPlaySelection');

  function secToTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = (sec % 60).toFixed(1);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(4,'0')}`;
  }

  function timeToSec(str) {
    if (!str) return 0;
    const parts = String(str).trim().split(':');
    if (parts.length === 1) return parseFloat(parts[0]) || 0;
    if (parts.length === 2) {
      const m = parseInt(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      return m * 60 + s;
    }
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }

  function updateDuration() {
    const start = timeToSec(startInput.value);
    const end = timeToSec(endInput.value);
    const dur = Math.max(0, end - start);
    durationEl.textContent = secToTime(dur);
  }

  function syncFromRange() {
    startInput.value = secToTime(+startRange.value);
    endInput.value = secToTime(+endRange.value);
    updateDuration();
  }

  async function loadFile(file) {
    const low = file.name.toLowerCase();
    if (!UT.VIDEO_EXTS.some(e => low.endsWith('.' + e))) {
      UT.showToast('Please choose a video file', 'warning');
      return;
    }

    UT.showOverlay('Loading video preview...');
    try {
      const res = await window.api.readFile(file.path);
      const bytes = UT.base64ToUint8(res.data);
      const blob = new Blob([bytes]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);

      videoFile = file;
      preview.src = previewUrl;

      preview.onloadedmetadata = () => {
        videoDuration = preview.duration || 0;
        startRange.max = videoDuration;
        endRange.max = videoDuration;
        startRange.value = 0;
        endRange.value = videoDuration;

        startInput.value = secToTime(0);
        endInput.value = secToTime(videoDuration);
        updateDuration();

        workspace.style.display = 'block';
        runBtn.disabled = false;
        UT.hideOverlay();
      };

      preview.onerror = () => {
        UT.hideOverlay();
        UT.showToast('❌ Cannot preview this video (codec not supported)', 'warning');
        videoFile = file;
        workspace.style.display = 'block';
        runBtn.disabled = false;
      };
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'Videos', extensions: UT.VIDEO_EXTS }
    ]);
    if (f) loadFile(f);
  });

  startRange.addEventListener('input', () => {
    const s = +startRange.value;
    const e = +endRange.value;
    if (s >= e) startRange.value = Math.max(0, e - 0.5);
    syncFromRange();
    preview.currentTime = +startRange.value;
  });

  endRange.addEventListener('input', () => {
    const s = +startRange.value;
    const e = +endRange.value;
    if (e <= s) endRange.value = Math.min(videoDuration, s + 0.5);
    syncFromRange();
    preview.currentTime = +endRange.value;
  });

  startInput.addEventListener('change', () => {
    let s = timeToSec(startInput.value);
    if (s < 0) s = 0;
    if (s >= videoDuration) s = Math.max(0, videoDuration - 0.5);
    startInput.value = secToTime(s);
    startRange.value = s;
    updateDuration();
  });

  endInput.addEventListener('change', () => {
    let e = timeToSec(endInput.value);
    if (e > videoDuration) e = videoDuration;
    if (e <= 0) e = 0.5;
    endInput.value = secToTime(e);
    endRange.value = e;
    updateDuration();
  });

  setStartBtn.addEventListener('click', () => {
    const t = preview.currentTime;
    startInput.value = secToTime(t);
    startRange.value = t;
    updateDuration();
  });

  setEndBtn.addEventListener('click', () => {
    const t = preview.currentTime;
    endInput.value = secToTime(t);
    endRange.value = t;
    updateDuration();
  });

  playSelBtn.addEventListener('click', () => {
    const s = timeToSec(startInput.value);
    const e = timeToSec(endInput.value);
    preview.currentTime = s;
    preview.play();
    const check = () => {
      if (preview.currentTime >= e) {
        preview.pause();
        preview.removeEventListener('timeupdate', check);
      }
    };
    preview.addEventListener('timeupdate', check);
  });

  resetBtn.addEventListener('click', () => {
    startRange.value = 0;
    endRange.value = videoDuration;
    startInput.value = secToTime(0);
    endInput.value = secToTime(videoDuration);
    updateDuration();
    preview.currentTime = 0;
  });

  clearBtn.addEventListener('click', () => {
    videoFile = null;
    videoDuration = 0;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    preview.src = '';
    workspace.style.display = 'none';
    runBtn.disabled = true;
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault(); dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      UT.VIDEO_EXTS.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!videoFile) return;

    const start = timeToSec(startInput.value);
    const end = timeToSec(endInput.value);
    if (end <= start) {
      UT.showToast('⚠️ End time must be after start time', 'warning');
      return;
    }

    const duration = end - start;
    const cleanName = UT.sanitizeFilename(videoFile.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const origExt = (videoFile.name.match(/\.([^.]+)$/) || [,'mp4'])[1].toLowerCase();

    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_trimmed.${origExt}`,
      filters: [{ name: origExt.toUpperCase(), extensions: [origExt] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vtrimProgressFill');
    const text = document.getElementById('vtrimProgressText');
    UT.setupVideoProgress(fill, text);

    let args = [
      '-ss', String(start),
      '-i', videoFile.path,
      '-t', String(duration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-y', outPath
    ];

    let res = await window.api.video.ffmpeg(args);

    if (!res.success) {
      text.textContent = 'Re-encoding (may take a while)...';
      args = [
        '-ss', String(start),
        '-i', videoFile.path,
        '-t', String(duration),
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-y', outPath
      ];
      res = await window.api.video.ffmpeg(args);
    }

    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast(`✅ Trimmed to ${secToTime(duration)}`, 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});