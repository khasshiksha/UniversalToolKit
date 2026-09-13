const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ... existing APIs
  openMultiple: (filter) => ipcRenderer.invoke('open-multiple-files', filter),
  openSingle:   (filter) => ipcRenderer.invoke('open-single-file', filter),
  saveFile:     (options) => ipcRenderer.invoke('save-file', options),
  readFile:     (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile:    (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  // ============ VIDEO TOOLS ============
  video: {
    ffmpeg: (args) => ipcRenderer.invoke('video:ffmpeg', args),
    ytdlp: (args) => ipcRenderer.invoke('video:ytdlp', args),
    cancel: () => ipcRenderer.invoke('video:cancel'),

    onProgress: (cb) => {
      const listener = (_e, data) => cb(data);
      ipcRenderer.on('video:progress', listener);
      return () => ipcRenderer.removeListener('video:progress', listener);
    }
  }
});