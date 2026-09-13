// ============================================================
// Video Tools - URL → Video
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Cookie selector helper ----------
  // If HTML does not contain the selector, default to AUTO mode.
  function setupCookieSelector(prefix) {
    const select = document.getElementById(prefix + 'Browser');
    const btn = document.getElementById(prefix + 'CookiesBtn');
    const nameEl = document.getElementById(prefix + 'CookiesName');

    // Element missing → default AUTO
    if (!select) {
      return { getOptions: () => ({ mode: 'auto' }) };
    }

    let filePath = '';

    select.addEventListener('change', () => {
      const showFilePicker = select.value === 'file';
      if (btn) btn.style.display = showFilePicker ? 'inline-block' : 'none';
      if (nameEl) nameEl.textContent = '';
      filePath = '';
    });

    if (btn) btn.addEventListener('click', async () => {
      const f = await window.api.openSingle([
        { name: 'Cookies File', extensions: ['txt'] }
      ]);
      if (!f) return;
      filePath = f.path;
      nameEl.textContent = f.name;
    });

    return {
      getOptions: () => {
        const val = select.value;
        if (val === 'auto') return { mode: 'auto' };
        if (val === 'file') {
          if (!filePath) return null;
          return { mode: 'file', filePath };
        }
        return { mode: 'browser', browser: val };
      }
    };
  }

  // ---------- Main ----------
  const runBtn = document.getElementById('vurlRunBtn');
  if (!runBtn) return;

  const cookieSel = setupCookieSelector('vurl');
  let quality = 'best';
  let format = 'mp4';
  UT.bindGroup('.vq-btn', b => { quality = b.dataset.q; });
  UT.bindGroup('.vfmt-btn', b => { format = b.dataset.fmt; });

  runBtn.addEventListener('click', async () => {
    const url = document.getElementById('vurlUrl').value.trim();
    if (!url) { UT.showToast('⚠️ Enter a video URL', 'warning'); return; }

    const cookieOptions = cookieSel.getOptions();
    if (cookieOptions === null) {
      UT.showToast('⚠️ Please choose a cookies.txt file first', 'warning');
      return;
    }

    UT.showOverlay('Fetching video info...');
    const rawTitle = await UT.getUrlTitle(url);
    const title = UT.sanitizeFilename(rawTitle);
    UT.hideOverlay();

    const outPath = await window.api.saveFile({
      defaultName: `${title}.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vurlProgressFill');
    const text = document.getElementById('vurlProgressText');
    UT.setupVideoProgress(fill, text);

    let fmtArg;
    if (quality === 'best') {
      fmtArg = 'bv*+ba/b';
    } else {
      fmtArg = `bv*[height<=${quality}]+ba/b[height<=${quality}]/b`;
    }

    const args = [
      '-f', fmtArg,
      '--merge-output-format', format,
      '-o', outPath,
      '--no-playlist',
      '--newline',
      '--force-overwrites',
      url
    ];

    const res = await window.api.video.ytdlp(args, cookieOptions);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Video downloaded', 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } else {
      const err = (res.stderr || res.error || 'Failed');
      if (err.includes('Could not copy Chrome cookie')) {
        UT.showToast('❌ Chrome cookies locked. Try Firefox or install Node.js.', 'error');
      } else if (err.includes('No supported JavaScript runtime')) {
        UT.showToast('❌ Missing JS runtime. Install Node.js (nodejs.org)', 'error');
      } else if (err.includes('Sign in to confirm')) {
        UT.showToast('❌ YouTube wants login. Use Firefox (logged in) or cookies.txt', 'error');
      } else {
        UT.showToast('❌ ' + err.slice(-250), 'error');
      }
    }
  });

  const cancelBtn = document.getElementById('vurlCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => window.api.video.cancel());

});