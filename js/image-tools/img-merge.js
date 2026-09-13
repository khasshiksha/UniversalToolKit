// ============================================================
// Image Tools - Merge Images to PDF
// By RAM B SHAM
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const mgr = UT.makeImageManager({
    listEl: document.getElementById('imgMergeList'),
    browseBtn: document.getElementById('imgMergeBrowseBtn'),
    clearBtn: document.getElementById('imgMergeClearBtn'),
    runBtn: document.getElementById('imgMergeRunBtn'),
    optionsEl: document.getElementById('imgMergeOptions'),
    dropZone: document.getElementById('imgMergeDropZone')
  });
  const runBtn = document.getElementById('imgMergeRunBtn');
  if (!runBtn) return;

  // Paper sizes in PDF points (base = portrait)
  const PAPER_SIZES = {
    A3: [842, 1191],
    A4: [595, 842],
    A5: [420, 595],
    A6: [298, 420],
    A7: [210, 298],
    A8: [147, 210]
  };

  let paper = 'A4';
  let orient = 'portrait';
  let layout = '1';
  let arrange = 'auto';

  UT.bindGroup('.paper-btn', b => { paper = b.dataset.p; });
  UT.bindGroup('.orient-btn', b => { orient = b.dataset.o; });
  UT.bindGroup('.layout-btn', b => { layout = b.dataset.l; });
  UT.bindGroup('.arrange-btn', b => { arrange = b.dataset.a; });

  const marginEl = document.getElementById('imgMergeMargin');
  const marginValEl = document.getElementById('imgMergeMarginVal');
  if (marginEl) marginEl.addEventListener('input', () => {
    marginValEl.textContent = marginEl.value + ' mm';
  });

  function getGrid(layoutCount, arrangement) {
    switch (layoutCount) {
      case '1': return { cols: 1, rows: 1 };
      case '2':
        return arrangement === 'horizontal'
          ? { cols: 2, rows: 1 }
          : { cols: 1, rows: 2 };
      case '4': return { cols: 2, rows: 2 };
      case '6':
        return arrangement === 'horizontal'
          ? { cols: 3, rows: 2 }
          : { cols: 2, rows: 3 };
      case '9': return { cols: 3, rows: 3 };
    }
    return { cols: 1, rows: 1 };
  }

  async function loadAndEmbed(doc, filePath, fileName) {
    const low = fileName.toLowerCase();
    const res = await window.api.readFile(filePath);
    const bytes = UT.base64ToUint8(res.data);

    if (low.endsWith('.png')) {
      const img = await doc.embedPng(bytes);
      return { img, w: img.width, h: img.height };
    }
    if (low.endsWith('.jpg') || low.endsWith('.jpeg')) {
      const img = await doc.embedJpg(bytes);
      return { img, w: img.width, h: img.height };
    }

    // WEBP → PNG via canvas
    const { img: imgEl, url } = await UT.loadImage(filePath);
    const c = document.createElement('canvas');
    c.width = imgEl.naturalWidth;
    c.height = imgEl.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(imgEl, 0, 0);
    URL.revokeObjectURL(url);
    const b64 = c.toDataURL('image/png').split(',')[1];
    const img = await doc.embedPng(UT.base64ToUint8(b64));
    return { img, w: img.width, h: img.height };
  }

  runBtn.addEventListener('click', async () => {
    const files = mgr.get();
    if (!files.length) return;

    const outPath = await window.api.saveFile({
      defaultName: 'merged_images.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!outPath) return;

    try {
      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);

      let [pw, ph] = PAPER_SIZES[paper];
      if (orient === 'landscape') [pw, ph] = [ph, pw];

      const { cols, rows } = getGrid(layout, arrange);
      const perPage = cols * rows;
      const totalPages = Math.ceil(files.length / perPage);

      const mmToPt = 2.8346;
      const margin = (+marginEl.value) * mmToPt;
      const spacing = 6;
      const showLabel = document.getElementById('imgMergeLabel').checked;
      const labelHeight = showLabel ? 14 : 0;
      const labelGap = showLabel ? 3 : 0;

      const cellW = (pw - margin * 2 - spacing * (cols - 1)) / cols;
      const cellH = (ph - margin * 2 - spacing * (rows - 1)) / rows;
      const imgCellH = cellH - labelHeight - labelGap;

      for (let p = 0; p < totalPages; p++) {
        UT.showOverlay(`Rendering page ${p + 1} / ${totalPages}...`);
        const page = doc.addPage([pw, ph]);

        for (let i = 0; i < perPage; i++) {
          const idx = p * perPage + i;
          if (idx >= files.length) break;

          const col = i % cols;
          const row = Math.floor(i / cols);

          const cellX = margin + col * (cellW + spacing);
          const yTop = ph - margin - row * (cellH + spacing);
          const yBottom = yTop - cellH;
          const imgYBottom = yBottom + labelHeight + labelGap;

          const entry = await loadAndEmbed(doc, files[idx].path, files[idx].name);
          const { img, w: imgW, h: imgH } = entry;

          const ar = imgW / imgH;
          let drawW = cellW;
          let drawH = drawW / ar;
          if (drawH > imgCellH) {
            drawH = imgCellH;
            drawW = drawH * ar;
          }

          const x = cellX + (cellW - drawW) / 2;
          const y = imgYBottom + (imgCellH - drawH) / 2;

          page.drawImage(img, { x, y, width: drawW, height: drawH });

          if (showLabel) {
            const fontSize = 8;
            let label = files[idx].name;
            let labelW = font.widthOfTextAtSize(label, fontSize);
            if (labelW > cellW) {
              while (label.length > 6 &&
                     font.widthOfTextAtSize(label + '…', fontSize) > cellW) {
                label = label.slice(0, -1);
              }
              label += '…';
              labelW = font.widthOfTextAtSize(label, fontSize);
            }
            page.drawText(label, {
              x: cellX + (cellW - labelW) / 2,
              y: yBottom + 2,
              size: fontSize,
              font,
              color: rgb(0.42, 0.42, 0.42)
            });
          }
        }
      }

      const outBytes = await doc.save();
      await window.api.writeFile(outPath, UT.uint8ToBase64(outBytes));
      UT.hideOverlay();
      UT.showToast(`✅ ${files.length} images → ${totalPages} page(s) [${cols}×${rows}]`, 'success');
      setTimeout(() => window.api.showInFolder(outPath), 300);
    } catch (err) {
      UT.hideOverlay();
      UT.showToast('❌ ' + err.message, 'error');
    }
  });

});