// ============================================================
// Audio Tools - Metadata Editor
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('ametaBrowseBtn');
  if (!browseBtn) return;

  let file = null;

  const dropZone = document.getElementById('ametaDropZone');
  const info = document.getElementById('ametaInfo');
  const options = document.getElementById('ametaOptions');
  const nameEl = document.getElementById('ametaFileName');
  const clearBtn = document.getElementById('ametaClearBtn');
  const runBtn = document.getElementById('ametaRunBtn');

  const titleEl = document.getElementById('ametaTitle');
  const artistEl = document.getElementById('ametaArtist');
  const albumEl = document.getElementById('ametaAlbum');
  const yearEl = document.getElementById('ametaYear');
  const genreEl = document.getElementById('ametaGenre');

  function setFile(f) {
    const low = f.name.toLowerCase();
    if (!['.mp3', '.m4a', '.flac', '.ogg', '.opus'].some(e => low.endsWith(e))) {
      UT.showToast('⚠️ Metadata editing supports MP3, M4A, FLAC, OGG, OPUS', 'warning');
      return;
    }
    file = f;
    nameEl.textContent = f.name;
    info.style.display = 'block';
    options.style.display = 'flex';
    runBtn.disabled = false;

    // Pre-fill title from filename
    const baseName = f.name.replace(/\.[^.]+$/, '');
    if (!titleEl.value) titleEl.value = baseName;
  }

  browseBtn.addEventListener('click', async () => {
    const f = await window.api.openSingle([
      { name: 'Audio', extensions: ['mp3', 'm4a', 'flac', 'ogg', 'opus'] }
    ]);
    if (f) setFile(f);
  });

  clearBtn.addEventListener('click', () => {
    file = null;
    info.style.display = 'none';
    options.style.display = 'none';
    runBtn.disabled = true;
    titleEl.value = '';
    artistEl.value = '';
    albumEl.value = '';
    yearEl.value = '';
    genreEl.value = '';
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) setFile({ path: f.path, name: f.name, size: f.size });
  });

  runBtn.addEventListener('click', async () => {
    if (!file) return;

    const origExt = (file.name.match(/\.([^.]+)$/) || [,'mp3'])[1].toLowerCase();
    const cleanName = UT.sanitizeFilename(file.name.replace(/\.[^.]+$/, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_tagged.${origExt}`,
      filters: [{ name: origExt.toUpperCase(), extensions: [origExt] }]
    });
    if (!outPath) return;

    UT.showOverlay('Writing metadata...');
    try {
      const args = ['-i', file.path, '-c', 'copy'];

      if (titleEl.value.trim()) args.push('-metadata', `title=${titleEl.value.trim()}`);
      if (artistEl.value.trim()) args.push('-metadata', `artist=${artistEl.value.trim()}`);
      if (albumEl.value.trim()) args.push('-metadata', `album=${albumEl.value.trim()}`);
      if (yearEl.value.trim()) args.push('-metadata', `date=${yearEl.value.trim()}`);
      if (genreEl.value.trim()) args.push('-metadata', `genre=${genreEl.value.trim()}`);

      args.push('-y', outPath);

      const res = await window.api.video.ffmpeg(args);
      UT.hideOverlay();

      if (res.success) {
        UT.showToast('✅ Metadata saved', 'success');
        setTimeout(() => window.api.showInFolder(outPath), 300);
      } else {
        UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
      }
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});