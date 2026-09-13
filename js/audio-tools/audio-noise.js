// ============================================================
// Audio Tools - Noise Reduce
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus'];

  const browseBtn = document.getElementById('anoiseBrowseBtn');
  if (!browseBtn) return;

  let file = null;
  let level = 'medium';

  const dropZone = document.getElementById('anoiseDropZone');
  const info = document.getElementById('anoiseInfo');
  const options = document.getElementById('anoiseOptions');
  const nameEl = document.getElementById('anoiseFileName');
  const clearBtn = document.getElementById('anoiseClearBtn');
  const runBtn = document.getElementById('anoiseRunBtn');

  UT.bindGroup('.anoise-lvl-btn', b => { level = b.dataset.lvl; });

  function setFile(f) {
    const low = f.name.toLowerCase();
    if (!AUDIO_EXTS.some(e => low.endsWith('.' + e))) {
      UT.showToast('Please choose an audio file', 'warning');
      return;
    }
    file = f;
    nameEl.textContent = f.name;
    info.style.display = 'block';
    options.style.display = 'flex';
    runBtn.disabled = false;
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([{ name: 'Audio', extensions: AUDIO_EXTS }]);
    if (f) setFile(f);
  });

  clearBtn.addEventListener('click', () => {
    file = null;
    info.style.display = 'none';
    options.style.display = 'none';
    runBtn.disabled = true;
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(x =>
      AUDIO_EXTS.some(ex => x.name.toLowerCase().endsWith('.' + ex)));
    if (f) setFile({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!file) return;

    // ffmpeg afftdn filter presets
    const presets = {
      light:   'afftdn=nr=8:nf=-50',
      medium:  'afftdn=nr=15:nf=-40',
      strong:  'afftdn=nr=25:nf=-30',
      extreme: 'afftdn=nr=35:nf=-25'
    };

    const cleanName = UT.sanitizeFilename(file.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const origExt = (file.name.match(/\.([^.]+)$/) || [,'mp3'])[1].toLowerCase();
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_clean.${origExt}`,
      filters: [{ name: origExt.toUpperCase(), extensions: [origExt] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('anoiseProgressFill');
    const text = document.getElementById('anoiseProgressText');
    UT.setupVideoProgress(fill, text);

    const codecMap = { mp3: 'libmp3lame', m4a: 'aac', wav: 'pcm_s16le', flac: 'flac', ogg: 'libvorbis', opus: 'libopus' };
    const args = [
      '-i', file.path,
      '-af', presets[level],
      '-c:a', codecMap[origExt] || 'libmp3lame'
    ];
    if (['mp3', 'm4a', 'ogg'].includes(origExt)) args.push('-b:a', '192k');
    args.push('-y', outPath);

    const res = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Noise reduced', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});