// ============================================================
// Video Tools - Resize Video
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const loader = UT.makeVideoLoader('vres', UT.VIDEO_EXTS);
  if (!loader.runBtn) return;

  let targetW = 0, targetH = 0;

  document.querySelectorAll('.vres-preset-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.vres-preset-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      targetW = +b.dataset.w;
      targetH = +b.dataset.h;
      document.getElementById('vresW').value = targetW;
      document.getElementById('vresH').value = targetH;
    });
  });

  loader.runBtn.addEventListener('click', async () => {
    const file = loader.getFile();
    if (!file) return;

    let w = +document.getElementById('vresW').value || targetW;
    let h = +document.getElementById('vresH').value || targetH;
    if (!w || !h) {
      UT.showToast('⚠️ Choose preset or enter dimensions', 'warning');
      return;
    }

    w = Math.round(w / 2) * 2;
    h = Math.round(h / 2) * 2;

    const lockAR = document.getElementById('vresLockAR').checked;
    const cleanName = UT.sanitizeFilename(file.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_${w}x${h}.mp4`,
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vresProgressFill');
    const text = document.getElementById('vresProgressText');
    UT.setupVideoProgress(fill, text);

    const scaleArg = lockAR
      ? `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`
      : `scale=${w}:${h}`;

    const args = [
      '-i', file.path,
      '-vf', scaleArg,
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'medium',
      '-c:a', 'aac', '-b:a', '160k',
      '-y', outPath
    ];

    const result = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (result.success) {
      UT.showToast('✅ Video resized', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (result.stderr || 'Failed').slice(-250), 'error');
    }
  });

});