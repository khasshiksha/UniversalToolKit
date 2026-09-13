// ============================================================
// Video Tools - Add Subtitles
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('vsubBrowseBtn');
  if (!browseBtn) return;

  let videoFile = null;
  let subPath = '';
  let fontSize = 22;
  let position = 'bottom';

  const dropZone = document.getElementById('vsubDropZone');
  const info = document.getElementById('vsubInfo');
  const nameEl = document.getElementById('vsubFileName');
  const clearBtn = document.getElementById('vsubClearBtn');
  const runBtn = document.getElementById('vsubRunBtn');
  const options = document.getElementById('vsubOptions');
  const subRow = document.getElementById('vsubSubRow');
  const subPathEl = document.getElementById('vsubSubPath');
  const subBtn = document.getElementById('vsubSubBtn');

  function updateRunBtn() {
    runBtn.disabled = !videoFile || !subPath;
  }

  function setVideo(f) {
    videoFile = f;
    nameEl.textContent = f.name;
    info.style.display = 'block';
    subRow.style.display = 'flex';
    options.style.display = 'flex';
    updateRunBtn();
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'Videos', extensions: UT.VIDEO_EXTS }
    ]);
    if (f) setVideo(f);
  });

  subBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'Subtitles', extensions: ['srt', 'ass', 'vtt'] }
    ]);
    if (!f) return;
    subPath = f.path;
    subPathEl.value = f.name;
    updateRunBtn();
  });

  clearBtn.addEventListener('click', () => {
    videoFile = null;
    subPath = '';
    info.style.display = 'none';
    subRow.style.display = 'none';
    options.style.display = 'none';
    subPathEl.value = '';
    updateRunBtn();
  });

  UT.bindGroup('.vsub-size-btn', b => { fontSize = +b.dataset.s; });
  UT.bindGroup('.vsub-pos-btn', b => { position = b.dataset.p; });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault(); dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      UT.VIDEO_EXTS.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
    if (f) setVideo({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!videoFile || !subPath) {
      UT.showToast('⚠️ Choose both video and SRT file', 'warning');
      return;
    }

    const cleanName = UT.sanitizeFilename(videoFile.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_subtitled.mp4`,
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vsubProgressFill');
    const text = document.getElementById('vsubProgressText');
    UT.setupVideoProgress(fill, text);

    const escapedSub = subPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    const align = position === 'top' ? '6' : '2';
    const styleStr = `FontSize=${fontSize},Alignment=${align},Outline=2,Shadow=0,MarginV=20`;

    const args = [
      '-i', videoFile.path,
      '-vf', `subtitles='${escapedSub}':force_style='${styleStr}'`,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-crf', '22',
      '-preset', 'medium',
      '-y', outPath
    ];

    const res = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Subtitles burned in', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});