// ============================================================
// Audio Tools - Audio to Video
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac'];

  const browseBtn = document.getElementById('a2vBrowseBtn');
  if (!browseBtn) return;

  let audioFile = null;
  let imagePath = '';

  const dropZone = document.getElementById('a2vDropZone');
  const info = document.getElementById('a2vInfo');
  const nameEl = document.getElementById('a2vFileName');
  const imgRow = document.getElementById('a2vImgRow');
  const imgPathEl = document.getElementById('a2vImgPath');
  const imgBtn = document.getElementById('a2vImgBtn');
  const options = document.getElementById('a2vOptions');
  const clearBtn = document.getElementById('a2vClearBtn');
  const runBtn = document.getElementById('a2vRunBtn');

  let W = 1280, H = 720;
  UT.bindGroup('.a2v-res-btn', b => { W = +b.dataset.w; H = +b.dataset.h; });

  function updateRunBtn() {
    runBtn.disabled = !audioFile || !imagePath;
  }

  function setAudio(f) {
    audioFile = f;
    nameEl.textContent = f.name;
    info.style.display = 'block';
    imgRow.style.display = 'flex';
    options.style.display = 'flex';
    updateRunBtn();
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([{ name: 'Audio', extensions: AUDIO_EXTS }]);
    if (f) setAudio(f);
  });

  imgBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }
    ]);
    if (!f) return;
    imagePath = f.path;
    imgPathEl.value = f.name;
    updateRunBtn();
  });

  clearBtn.addEventListener('click', () => {
    audioFile = null;
    imagePath = '';
    info.style.display = 'none';
    imgRow.style.display = 'none';
    options.style.display = 'none';
    imgPathEl.value = '';
    updateRunBtn();
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      AUDIO_EXTS.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
    if (f) setAudio({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!audioFile || !imagePath) {
      UT.showToast('⚠️ Choose both audio and image', 'warning');
      return;
    }

    const cleanName = UT.sanitizeFilename(audioFile.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}.mp4`,
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('a2vProgressFill');
    const text = document.getElementById('a2vProgressText');
    UT.setupVideoProgress(fill, text);

    // Loop image + audio, shortest
    const args = [
      '-loop', '1',
      '-i', imagePath,
      '-i', audioFile.path,
      '-c:v', 'libx264',
      '-tune', 'stillimage',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`,
      '-shortest',
      '-y', outPath
    ];

    const res = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Video created', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});