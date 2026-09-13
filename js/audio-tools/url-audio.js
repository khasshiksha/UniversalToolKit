// ============================================================
// Audio Tools - URL → Audio
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
  const runBtn = document.getElementById('vaudRunBtn');
  if (!runBtn) return;

  const cookieSel = setupCookieSelector('vaud');
  let format = 'mp3';
  let quality = '192';
  UT.bindGroup('.vaud-fmt-btn', b => { format = b.dataset.fmt; });
  UT.bindGroup('.vaud-q-btn', b => { quality = b.dataset.q; });

  runBtn.addEventListener('click', async () => {
    const url = document.getElementById('vaudUrl').value.trim();
    if (!url) { UT.showToast('⚠️ Enter a URL', 'warning'); return; }

    const cookieOptions = cookieSel.getOptions();
    if (cookieOptions === null) {
      UT.showToast('⚠️ Please choose a cookies.txt file first', 'warning');
      return;
    }

    UT.showOverlay('Fetching audio info...');
    const rawTitle = await UT.getUrlTitle(url);
    const title = UT.sanitizeFilename(rawTitle);
    UT.hideOverlay();

    const outPath = await window.api.saveFile({
      defaultName: `${title}.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (!outPath) return;

    const fill = document.getElementById('vaudProgressFill');
    const text = document.getElementById('vaudProgressText');
    UT.setupVideoProgress(fill, text);

    const args = [
      '-x',
      '--audio-format', format,
      '--audio-quality', (format === 'wav' || format === 'flac') ? '0' : quality + 'K',
      '-o', outPath,
      '--no-playlist',
      '--newline',
      '--force-overwrites',
      url
    ];

    const res = await window.api.video.ytdlp(args, cookieOptions);
    UT.hideVideoProgress(fill);

    if (res.success) {
      UT.showToast('✅ Audio downloaded', 'success');
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

  const cancelBtn = document.getElementById('vaudCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => window.api.video.cancel());

});