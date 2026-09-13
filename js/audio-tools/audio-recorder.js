// ============================================================
// Audio Tools - Voice Recorder
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const startBtn = document.getElementById('recStartBtn');
  if (!startBtn) return;

  const stopBtn = document.getElementById('recStopBtn');
  const saveBtn = document.getElementById('recSaveBtn');
  const clearBtn = document.getElementById('recClearBtn');
  const timeEl = document.getElementById('recTime');
  const statusEl = document.getElementById('recStatus');
  const optionsEl = document.getElementById('recOptions');

  let mediaRecorder = null;
  let chunks = [];
  let recordedBlob = null;
  let stream = null;
  let timerInterval = null;
  let startTime = 0;
  let outFormat = 'mp3';

  UT.bindGroup('.rec-fmt-btn', b => { outFormat = b.dataset.fmt; });

  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recordedBlob = null;

      // Pick best supported mime
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
      let mime = '';
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }
      }

      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        saveBtn.disabled = false;
        optionsEl.style.display = 'flex';
        statusEl.textContent = 'Recording stopped';
        statusEl.classList.remove('recording');
      };

      mediaRecorder.start(250);
      startTime = Date.now();
      timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        timeEl.textContent = formatTime(elapsed);
      }, 200);

      statusEl.textContent = '● Recording...';
      statusEl.classList.add('recording');
      startBtn.disabled = true;
      stopBtn.disabled = false;
      saveBtn.disabled = true;

      // Release mic when done
      stream.getAudioTracks().forEach(t => t.onended = () => {});

    } catch (err) {
      UT.showToast('❌ Microphone access denied: ' + err.message, 'error');
    }
  }

  function stopRecording() {
    if (!mediaRecorder) return;
    mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);

  clearBtn.addEventListener('click', () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    recordedBlob = null;
    chunks = [];
    timeEl.textContent = '00:00:00';
    statusEl.textContent = 'Ready';
    statusEl.classList.remove('recording');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    saveBtn.disabled = true;
    optionsEl.style.display = 'none';
  });

  saveBtn.addEventListener('click', async () => {
    if (!recordedBlob) return;

    const cleanName = `recording_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}`;
    const outPath = await window.api.saveFile({
      defaultName: `${cleanName}.${outFormat}`,
      filters: [{ name: outFormat.toUpperCase(), extensions: [outFormat] }]
    });
    if (!outPath) return;

    UT.showOverlay('Saving recording...');
    try {
      // Save raw blob first (as webm)
      const arrBuf = await recordedBlob.arrayBuffer();
      const rawBytes = new Uint8Array(arrBuf);
      const rawPath = outPath.replace(/\.[^.]+$/, '_raw.webm');
      await window.api.writeFile(rawPath, UT.uint8ToBase64(rawBytes));

      // Convert to target format
      const codecMap = { mp3: 'libmp3lame', m4a: 'aac', wav: 'pcm_s16le', webm: 'libopus' };
      const args = ['-i', rawPath, '-c:a', codecMap[outFormat] || 'libmp3lame'];
      if (outFormat === 'mp3' || outFormat === 'm4a') args.push('-b:a', '192k');
      args.push('-y', outPath);

      const res = await window.api.video.ffmpeg(args);
      UT.hideOverlay();

      if (res.success) {
        UT.showToast('✅ Recording saved', 'success');
        setTimeout(() => window.api.showInFolder(outPath), 300);
      } else {
        // Fallback: at least the raw webm exists
        UT.showToast('⚠️ Saved as WEBM (conversion failed)', 'warning');
        setTimeout(() => window.api.showInFolder(rawPath), 300);
      }
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});