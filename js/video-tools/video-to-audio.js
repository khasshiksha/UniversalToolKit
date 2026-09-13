// ============================================================
// Video Tools - Video to Audio
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const loader = UT.makeVideoLoader('v2a', UT.VIDEO_EXTS);
  if (!loader.runBtn) return;

  let fmt = 'mp3';
  let q = '192';
  UT.bindGroup('.v2a-fmt-btn', b => { fmt = b.dataset.fmt; });
  UT.bindGroup('.v2a-q-btn', b => { q = b.dataset.q; });

  loader.runBtn.addEventListener('click', async () => {
    const file = loader.getFile();
    if (!file) return;
    const cleanName = UT.sanitizeFilename(file.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}.${fmt}`,
      filters: [{ name: fmt.toUpperCase(), extensions: [fmt] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('v2aProgressFill');
    const text = document.getElementById('v2aProgressText');
    UT.setupVideoProgress(fill, text);

    const codecMap = { mp3: 'libmp3lame', m4a: 'aac', wav: 'pcm_s16le', flac: 'flac' };
    const args = ['-i', file.path, '-vn', '-c:a', codecMap[fmt]];
    if (fmt === 'mp3' || fmt === 'm4a') args.push('-b:a', q + 'k');
    args.push('-y', outPath);

    const res = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Audio extracted', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      const errMsg = (res.stderr || 'Failed').slice(-300);
      if (errMsg.includes('does not contain any stream')) {
        UT.showToast('❌ यो video file मा audio stream छैन', 'error');
      } else {
        UT.showToast('❌ ' + errMsg, 'error');
      }
    }
  });

});