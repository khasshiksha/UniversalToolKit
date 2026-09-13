// ============================================================
// Video Tools - Merge Videos
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const browseBtn = document.getElementById('vmBrowseBtn');
  if (!browseBtn) return;

  const files = [];
  const listEl = document.getElementById('vmList');
  const dropZone = document.getElementById('vmDropZone');
  const clearBtn = document.getElementById('vmClearBtn');
  const runBtn = document.getElementById('vmRunBtn');

  function render() {
    listEl.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.draggable = true;
      li.innerHTML = `
        <span class="file-handle">☰</span>
        <span class="file-num">${i + 1}</span>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-size">${UT.formatSize(f.size)}</div>
        </div>
        <button class="file-remove">✕</button>`;
      li.querySelector('.file-remove').addEventListener('click', (e) => {
        e.stopPropagation(); files.splice(i, 1); render();
      });
      li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', i);
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => {
        e.preventDefault(); li.classList.add('drag-target');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-target'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-target');
        const from = +e.dataTransfer.getData('text/plain');
        if (from === i) return;
        const [moved] = files.splice(from, 1);
        files.splice(i, 0, moved);
        render();
      });
      listEl.appendChild(li);
    });
    runBtn.disabled = files.length < 2;
  }

  function add(list) {
    list.forEach(f => {
      if (!UT.VIDEO_EXTS.some(e => f.name.toLowerCase().endsWith('.' + e))) return;
      if (files.some(x => x.path === f.path)) return;
      files.push(f);
    });
    render();
  }

  browseBtn.addEventListener('click', async () => {
    const res = await window.api.openMultiple([
      { name: 'Videos', extensions: UT.VIDEO_EXTS }
    ]);
    if (res.length) add(res);
  });

  clearBtn.addEventListener('click', () => { files.length = 0; render(); });

  runBtn.addEventListener('click', async () => {
    if (files.length < 2) return;

    const outPath = await window.api.saveFile({
      defaultName: 'merged.mp4',
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (!outPath) return;

    const listPath = outPath.replace(/\.[^.]+$/, '_list.txt');
    const listContent = files.map(f =>
      `file '${f.path.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`
    ).join('\n');
    await window.api.writeFile(listPath, btoa(unescape(encodeURIComponent(listContent))));

    const fill = document.getElementById('vmProgressFill');
    const text = document.getElementById('vmProgressText');
    UT.setupVideoProgress(fill, text);
    text.textContent = 'Merging (fast copy)...';

    let args = ['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outPath];
    let res = await window.api.video.ffmpeg(args);

    if (!res.success) {
      text.textContent = 'Re-encoding (may take a while)...';
      args = [
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c:v', 'libx264', '-crf', '23', '-preset', 'medium',
        '-c:a', 'aac', '-b:a', '192k',
        '-y', outPath
      ];
      res = await window.api.video.ffmpeg(args);
    }

    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Videos merged', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ Merge failed. Try converting all videos first.', 'error');
    }
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault(); dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const list = Array.from(e.dataTransfer.files)
      .map(f => ({ path: f.path, name: f.name, size: f.size }));
    add(list);
  });

});