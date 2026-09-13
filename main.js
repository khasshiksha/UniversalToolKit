// ============================================================
// Universal Toolkit - Main Process
// By RAM B SHAM
// ============================================================

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let ffmpegStatic = null;
let ffprobeStatic = null;
try { ffmpegStatic = require('ffmpeg-static'); } catch (e) {}
try { ffprobeStatic = require('ffprobe-static'); } catch (e) {}

let mainWindow;

// ============================================================
// Path resolvers
// ============================================================
function getFfmpegPath() {
  if (!ffmpegStatic) return null;
  let p = ffmpegStatic;
  if (p && p.includes('app.asar')) p = p.replace('app.asar', 'app.asar.unpacked');
  return p;
}

function getFfprobePath() {
  if (!ffprobeStatic || !ffprobeStatic.path) return null;
  let p = ffprobeStatic.path;
  if (p && p.includes('app.asar')) p = p.replace('app.asar', 'app.asar.unpacked');
  return p;
}

function getYtdlpPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'bin', 'yt-dlp.exe'),
    path.join(__dirname, 'bin', 'yt-dlp.exe')
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (e) {}
  }
  return 'yt-dlp';
}

// Find Node.js runtime (needed by yt-dlp for YouTube)
function findNodeRuntime() {
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe')
  ];
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return c; } catch (e) {}
  }
  return null; // Fallback to system PATH
}

// ============================================================
// Window
// ============================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'build/icon.ico')
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');
}


const { autoUpdater } = require('electron-updater');

// ... तपाईंको createWindow() फंक्शन पछि ...

app.whenReady().then(() => {
  createWindow();
  
  // एप सुरु भएपछि अपडेट जाँच्नुहोस्
  autoUpdater.checkForUpdatesAndNotify();
  
  // अपडेट डाउनलोड भएपछि प्रयोगकर्तालाई सोध्नुहोस्
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'अपडेट उपलब्ध',
      message: `नयाँ संस्करण ${info.version} डाउनलोड भएको छ।`,
      buttons: ['अहिले इन्स्टल गर्नुहोस्', 'पछि']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
});


// ============================================================
// File Dialog IPC
// ============================================================
ipcMain.handle('open-multiple-files', async (event, filter) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filter || [{ name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled) return [];
  return result.filePaths.map(p => ({
    path: p, name: path.basename(p), size: fs.statSync(p).size
  }));
});

ipcMain.handle('open-single-file', async (event, filter) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filter || [{ name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled) return null;
  const p = result.filePaths[0];
  return { path: p, name: path.basename(p), size: fs.statSync(p).size };
});

ipcMain.handle('save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultName || 'output',
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return { success: true, data: fs.readFileSync(filePath).toString('base64') };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('write-file', async (event, filePath, base64Data) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('show-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// ============================================================
// Video IPC - ffmpeg
// ============================================================
ipcMain.handle('video:ffmpeg', async (event, args) => {
  return new Promise((resolve) => {
    const ff = getFfmpegPath();
    if (!ff) { resolve({ success: false, error: 'ffmpeg binary not found' }); return; }

    const proc = spawn(ff, args);
    let stderr = '';
    let lastTime = '';

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(chunk);
      if (m && m[0] !== lastTime) {
        lastTime = m[0];
        event.sender.send('video:progress', { h: +m[1], m: +m[2], s: parseFloat(m[3]) });
      }
      if (stderr.length > 50000) stderr = stderr.slice(-30000);
    });

    proc.on('error', (err) => resolve({ success: false, error: err.message }));
    proc.on('close', (code) => {
      resolve({ success: code === 0, code, stderr: stderr.slice(-4000) });
    });
  });
});

// ============================================================
// Video IPC - yt-dlp (smart cookie + runtime handling)
// ============================================================

// Auto-detect browser order (Firefox first - most reliable)
const AUTO_BROWSER_ORDER = [
  'firefox',
  'edge',
  'brave',
  'opera',
  'vivaldi',
  'chromium',
  'chrome'
];

function buildCookieArgs(cookieOptions) {
  if (!cookieOptions) return [];

  if (cookieOptions.mode === 'file' && cookieOptions.filePath) {
    return ['--cookies', cookieOptions.filePath];
  }

  if (cookieOptions.mode === 'browser' && cookieOptions.browser) {
    return ['--cookies-from-browser', cookieOptions.browser];
  }

  if (cookieOptions.mode === 'auto') {
    return null;
  }

  return [];
}

// Build base args (common to all yt-dlp calls)
function buildBaseArgs() {
  const args = [];

  // ffmpeg location
  const ffmpegPath = getFfmpegPath();
  if (ffmpegPath) {
    args.push('--ffmpeg-location', path.dirname(ffmpegPath));
  }

  // Node.js runtime (for YouTube's JS challenges)
  const nodePath = findNodeRuntime();
  if (nodePath) {
    args.push('--js-runtimes', `node:${nodePath}`);
  }

  args.push(
    '--extractor-args', 'youtube:player_client=android,web_embedded,web_safari',
    '--no-warnings',
    '--no-check-certificate'
  );

  return args;
}

// Run yt-dlp once
function runYtdlp(yt, fullArgs, event) {
  return new Promise((resolve) => {
    console.log('[yt-dlp] Running:', yt);
    console.log('[yt-dlp] Args:', fullArgs.join(' '));

    const proc = spawn(yt, fullArgs);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      const m = /\[download\]\s+([\d.]+)%/.exec(chunk);
      if (m) event.sender.send('video:progress', { percent: parseFloat(m[1]) });
      if (stdout.length > 50000) stdout = stdout.slice(-30000);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });

    proc.on('error', (err) => resolve({ success: false, error: err.message, code: -1 }));
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-4000)
      });
    });
  });
}

// Check if error is cookie-related
function isCookieError(result) {
  if (result.success) return false;
  const msg = (result.stderr || '') + (result.error || '');
  return /cookie|Sign in to confirm|bot|Could not copy|Permission denied/i.test(msg);
}

ipcMain.handle('video:ytdlp', async (event, args, cookieOptions) => {
  const yt = getYtdlpPath();
  const baseArgs = buildBaseArgs();
  const cookieArgs = buildCookieArgs(cookieOptions);

  // ---- Specific browser or cookies.txt ----
  if (cookieArgs !== null) {
    const fullArgs = [...baseArgs, ...cookieArgs, ...args];
    return await runYtdlp(yt, fullArgs, event);
  }

  // ---- Auto mode ----
  // Try WITHOUT cookies first
  console.log('[yt-dlp] Auto: trying without cookies');
  let lastResult = await runYtdlp(yt, [...baseArgs, ...args], event);
  if (lastResult.success) return lastResult;

  // Only retry with cookies if cookie-related error
  if (!isCookieError(lastResult)) return lastResult;

  for (const browser of AUTO_BROWSER_ORDER) {
    console.log(`[yt-dlp] Auto: trying "${browser}"`);
    event.sender.send('video:progress', { percent: 0 });
    const res = await runYtdlp(yt,
      [...baseArgs, '--cookies-from-browser', browser, ...args],
      event);
    if (res.success) return res;
    lastResult = res;
  }

  return lastResult;
});

// ============================================================
// Cancel
// ============================================================
let activeProcess = null;
ipcMain.handle('video:cancel', async () => {
  if (activeProcess) {
    try { activeProcess.kill('SIGKILL'); } catch (e) {}
    activeProcess = null;
    return { success: true };
  }
  return { success: false };
});

// ============================================================
// App lifecycle
// ============================================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});