// ============================================================
// Audio Tools - Convert Format
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus'];

  const browseBtn = document.getElementById('aconvBrowseBtn');
  if (!browseBtn) return;

  const files = [];
  const listEl = document.getElementById('aconvList');
  const dropZone = document.getElementById('aconvDropZone');
  const clearBtn = document.getElementById('aconvClearBtn');
  const runBtn = document.getElementById('aconvRunBtn');
  const optionsEl = document.getElementById('aconvOptions');

  let outFmt = 'mp3';
  let outQ = '192';

  UT.bindGroup('.aconv-fmt-btn', b => { outFmt = b.dataset.fmt; });
  UT.bindGroup('.aconv-q-btn', b => { outQ = b.dataset.q; });

  function render() {
    listEl.innerHTML = '';
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
        files.splice(i, 1); render();
      });
      listEl.appendChild(li);
    });
    runBtn.disabled = files.length === 0;
    optionsEl.style.display = files.length ? 'flex' : 'none';
  }

  function add(list) {
    list.forEach(f => {
      const low = f.name.toLowerCase();
      if (!AUDIO_EXTS.some(e => low.endsWith('.' + e))) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  }

  browseBtn.addEventListener('click', async () => {
    const res = await window.api.openMultiple([
      { name: 'Audio', extensions: AUDIO_EXTS }
    ]);
    if (res.length) add(res);
  });

  clearBtn.addEventListener('click', () => { files.length = 0; render(); });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const list = Array.from(e.dataTransfer.files)
      .map(f => ({ path: f.path, name: f.name, size: f.size }));
    add(list);
  });

  runBtn.addEventListener('click', async () => {
    if (!files.length) return;
    const prefix = await UT.pickPrefix('converted_audio_1.' + outFmt);
    if (!prefix) return;

    const fill = document.getElementById('aconvProgressFill');
    const text = document.getElementById('aconvProgressText');
    UT.setupVideoProgress(fill, text);

    const codecMap = {
      mp3: 'libmp3lame', m4a: 'aac', wav: 'pcm_s16le',
      flac: 'flac', ogg: 'libvorbis'
    };

    try {
      for (let i = 0; i < files.length; i++) {
        UT.showOverlay(`Converting ${i + 1} / ${files.length}...`);
        const args = ['-i', files[i].path, '-c:a', codecMap[outFmt] || 'libmp3lame'];
        if (['mp3', 'm4a', 'ogg'].includes(outFmt)) args.push('-b:a', outQ + 'k');
        args.push('-y', `${prefix}_${i + 1}.${outFmt}`);

        const res = await window.api.video.ffmpeg(args);
        if (!res.success) throw new Error(res.stderr || 'Conversion failed');
      }
      UT.hideOverlay();
      UT.hideVideoProgress(fill);
      UT.showToast(`✅ Converted ${files.length} file(s)`, 'success');
      setTimeout(() => window.api.showInFolder(prefix + '_1.' + outFmt), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.hideVideoProgress(fill);
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});