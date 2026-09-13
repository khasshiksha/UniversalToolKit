// ============================================================
// Video Tools - Convert Format
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const loader = UT.makeVideoLoader('vc', UT.VIDEO_EXTS);
  if (!loader.runBtn) return;

  let fmt = 'mp4';
  let q = 'medium';
  UT.bindGroup('.vc-fmt-btn', b => { fmt = b.dataset.fmt; });
  UT.bindGroup('.vc-q-btn', b => { q = b.dataset.q; });

  const preset = {
    high:   { crf: '20', preset: 'slow' },
    medium: { crf: '23', preset: 'medium' },
    low:    { crf: '28', preset: 'fast' }
  };

  loader.runBtn.addEventListener('click', async () => {
    const file = loader.getFile();
    if (!file) return;
    const cleanName = UT.sanitizeFilename(file.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_converted.${fmt}`,
      filters: [{ name: fmt.toUpperCase(), extensions: [fmt] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vcProgressFill');
    const text = document.getElementById('vcProgressText');
    UT.setupVideoProgress(fill, text);

    const args = [
      '-i', file.path,
      '-c:v', 'libx264',
      '-crf', preset[q].crf,
      '-preset', preset[q].preset,
      '-c:a', 'aac', '-b:a', '192k',
      '-y', outPath
    ];

    const res = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Video converted', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (res.stderr || 'Failed').slice(-250), 'error');
    }
  });

});