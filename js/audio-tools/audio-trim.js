// ============================================================
// Audio Tools - Trim / Cut
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus'];

  const browseBtn = document.getElementById('atrimBrowseBtn');
  if (!browseBtn) return;

  let audioFile = null;
  let duration = 0;
  let previewUrl = null;

  const dropZone = document.getElementById('atrimDropZone');
  const workspace = document.getElementById('atrimWorkspace');
  const preview = document.getElementById('atrimPreview');
  const startRange = document.getElementById('atrimStartRange');
  const endRange = document.getElementById('atrimEndRange');
  const startInput = document.getElementById('atrimStart');
  const endInput = document.getElementById('atrimEnd');
  const durationEl = document.getElementById('atrimDuration');
  const clearBtn = document.getElementById('atrimClearBtn');
  const runBtn = document.getElementById('atrimRunBtn');
  const setStartBtn = document.getElementById('atrimSetStart');
  const setEndBtn = document.getElementById('atrimSetEnd');
  const resetBtn = document.getElementById('atrimReset');
  const playSelBtn = document.getElementById('atrimPlaySelection');

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
    if (parts.length === 2) return (parseInt(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
  }
  function updateDuration() {
    const s = timeToSec(startInput.value);
    const e = timeToSec(endInput.value);
    durationEl.textContent = secToTime(Math.max(0, e - s));
  }
  function syncFromRange() {
    startInput.value = secToTime(+startRange.value);
    endInput.value = secToTime(+endRange.value);
    updateDuration();
  }

  async function loadFile(file) {
    const low = file.name.toLowerCase();
    if (!AUDIO_EXTS.some(e => low.endsWith('.' + e))) {
      UT.showToast('Please choose an audio file', 'warning');
      return;
    }
    UT.showOverlay('Loading preview...');
    try {
      const res = await window.api.readFile(file.path);
      const blob = new Blob([UT.base64ToUint8(res.data)]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      audioFile = file;
      preview.src = previewUrl;

      preview.onloadedmetadata = () => {
        duration = preview.duration || 0;
        startRange.max = duration;
        endRange.max = duration;
        startRange.value = 0;
        endRange.value = duration;
        startInput.value = secToTime(0);
        endInput.value = secToTime(duration);
        updateDuration();
        workspace.style.display = 'block';
        runBtn.disabled = false;
        UT.hideOverlay();
      };
      preview.onerror = () => {
        UT.hideOverlay();
        UT.showToast('⚠️ Cannot preview (codec unsupported), but you can still trim', 'warning');
        audioFile = file;
        workspace.style.display = 'block';
        runBtn.disabled = false;
      };
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([{ name: 'Audio', extensions: AUDIO_EXTS }]);
    if (f) loadFile(f);
  });

  startRange.addEventListener('input', () => {
    if (+startRange.value >= +endRange.value) startRange.value = Math.max(0, +endRange.value - 0.5);
    syncFromRange();
    preview.currentTime = +startRange.value;
  });
  endRange.addEventListener('input', () => {
    if (+endRange.value <= +startRange.value) endRange.value = Math.min(duration, +startRange.value + 0.5);
    syncFromRange();
    preview.currentTime = +endRange.value;
  });
  startInput.addEventListener('change', () => {
    let s = timeToSec(startInput.value);
    if (s < 0) s = 0;
    if (s >= duration) s = Math.max(0, duration - 0.5);
    startInput.value = secToTime(s);
    startRange.value = s;
    updateDuration();
  });
  endInput.addEventListener('change', () => {
    let e = timeToSec(endInput.value);
    if (e > duration) e = duration;
    if (e <= 0) e = 0.5;
    endInput.value = secToTime(e);
    endRange.value = e;
    updateDuration();
  });

  setStartBtn.addEventListener('click', () => {
    startInput.value = secToTime(preview.currentTime);
    startRange.value = preview.currentTime;
    updateDuration();
  });
  setEndBtn.addEventListener('click', () => {
    endInput.value = secToTime(preview.currentTime);
    endRange.value = preview.currentTime;
    updateDuration();
  });

  playSelBtn.addEventListener('click', () => {
    preview.currentTime = timeToSec(startInput.value);
    preview.play();
    const check = () => {
      if (preview.currentTime >= timeToSec(endInput.value)) {
        preview.pause();
        preview.removeEventListener('timeupdate', check);
      }
    };
    preview.addEventListener('timeupdate', check);
  });

  resetBtn.addEventListener('click', () => {
    startRange.value = 0;
    endRange.value = duration;
    startInput.value = secToTime(0);
    endInput.value = secToTime(duration);
    updateDuration();
  });

  clearBtn.addEventListener('click', () => {
    audioFile = null;
    duration = 0;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    preview.src = '';
    workspace.style.display = 'none';
    runBtn.disabled = true;
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      AUDIO_EXTS.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
    if (f) loadFile({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!audioFile) return;
    const start = timeToSec(startInput.value);
    const end = timeToSec(endInput.value);
    if (end <= start) { UT.showToast('⚠️ End must be after start', 'warning'); return; }

    const dur = end - start;
    const cleanName = UT.sanitizeFilename(audioFile.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const origExt = (audioFile.name.match(/\.([^.]+)$/) || [,'mp3'])[1].toLowerCase();
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_trimmed.${origExt}`,
      filters: [{ name: origExt.toUpperCase(), extensions: [origExt] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('atrimProgressFill');
    const text = document.getElementById('atrimProgressText');
    UT.setupVideoProgress(fill, text);

    // Try copy first
    let args = ['-ss', String(start), '-i', audioFile.path, '-t', String(dur), '-c', 'copy', '-y', outPath];
    let res = await window.api.video.ffmpeg(args);

    if (!res.success) {
      text.textContent = 'Re-encoding...';
      const codecMap = { mp3: 'libmp3lame', m4a: 'aac', wav: 'pcm_s16le', flac: 'flac', ogg: 'libvorbis' };
      args = ['-ss', String(start), '-i', audioFile.path, '-t', String(dur),
              '-c:a', codecMap[origExt] || 'libmp3lame'];
      if (['mp3', 'm4a', 'ogg'].includes(origExt)) args.push('-b:a', '192k');
      args.push('-y', outPath);
      res = await window.api.video.ffmpeg(args);
    }

    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast(`✅ Trimmed to ${secToTime(dur)}`, 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});