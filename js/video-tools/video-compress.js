// ============================================================
// Video Tools - Compress Video
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const loader = UT.makeVideoLoader('vcmp', UT.VIDEO_EXTS);
  if (!loader.runBtn) return;

  let level = 'balanced';
  let res = 'keep';
  UT.bindGroup('.vcmp-lvl-btn', b => { level = b.dataset.lvl; });
  UT.bindGroup('.vcmp-res-btn', b => { res = b.dataset.res; });

  const preset = {
    light:    { crf: '20', scale: null },
    balanced: { crf: '26', scale: null },
    strong:   { crf: '30', scale: null },
    extreme:  { crf: '34', scale: '640:-2' }
  };

  loader.runBtn.addEventListener('click', async () => {
    const file = loader.getFile();
    if (!file) return;
    const cleanName = UT.sanitizeFilename(file.name.replace(/\.(f\d+\.)?[^.]+$/i, ''));
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}_compressed.mp4`,
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vcmpProgressFill');
    const text = document.getElementById('vcmpProgressText');
    UT.setupVideoProgress(fill, text);

    const args = ['-i', file.path, '-c:v', 'libx264', '-crf', preset[level].crf];
    if (res !== 'keep') {
      args.push('-vf', `scale=-2:${res}`);
    } else if (preset[level].scale) {
      args.push('-vf', `scale=${preset[level].scale}`);
    }
    args.push('-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', '-y', outPath);

    const result = await window.api.video.ffmpeg(args);
    UT.hideVideoProgress(fill);

    if (result.success) {
      UT.showToast('✅ Video compressed', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      UT.showToast('❌ ' + (result.stderr || 'Failed').slice(-250), 'error');
    }
  });

});