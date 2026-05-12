// Passport Photo — Create standard passport size photos with background
export async function process(files, options, onProgress) {
  const sizeMap = {
    '2x2': { w: 2, h: 2, unit: 'in', label: '2×2 inch (US/India)' },
    '35x45': { w: 35, h: 45, unit: 'mm', label: '35×45 mm (UK/EU)' },
    '33x48': { w: 35, h: 48, unit: 'mm', label: '35×48 mm (Australia)' },
    'custom': { w: options.passportWidth || 35, h: options.passportHeight || 45, unit: 'mm', label: 'Custom' },
  };
  
  const size = sizeMap[options.passportSize || '2x2'];
  const DPI = 300;
  let pxW, pxH;
  
  if (size.unit === 'in') {
    pxW = Math.round(size.w * DPI);
    pxH = Math.round(size.h * DPI);
  } else {
    pxW = Math.round((size.w / 25.4) * DPI);
    pxH = Math.round((size.h / 25.4) * DPI);
  }
  
  const bgColor = options.bgColor || '#ffffff';
  
  onProgress(20, 'Loading image...');
  const img = await loadImage(files[0]);
  
  onProgress(40, 'Creating passport photo...');
  
  // Create single passport photo
  const single = document.createElement('canvas');
  single.width = pxW;
  single.height = pxH;
  const sCtx = single.getContext('2d');
  
  // Fill background
  sCtx.fillStyle = bgColor;
  sCtx.fillRect(0, 0, pxW, pxH);
  
  // Scale and center-crop the image to fill the passport size
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const passRatio = pxW / pxH;
  let sx, sy, sw, sh;
  
  if (imgRatio > passRatio) {
    sh = img.naturalHeight;
    sw = sh * passRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / passRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) * 0.15; // bias toward top (face area)
  }
  
  sCtx.drawImage(img, sx, sy, sw, sh, 0, 0, pxW, pxH);
  
  onProgress(60, 'Creating print sheet...');
  
  // Create 4×2 grid sheet (4R photo paper: 4×6 inches at 300 DPI)
  const sheetW = 6 * DPI; // 1800px
  const sheetH = 4 * DPI; // 1200px
  const sheet = document.createElement('canvas');
  sheet.width = sheetW;
  sheet.height = sheetH;
  const shCtx = sheet.getContext('2d');
  
  shCtx.fillStyle = '#ffffff';
  shCtx.fillRect(0, 0, sheetW, sheetH);
  
  // Calculate grid
  const cols = Math.floor(sheetW / (pxW + 20));
  const rows = Math.floor(sheetH / (pxH + 20));
  const startX = (sheetW - (cols * (pxW + 20) - 20)) / 2;
  const startY = (sheetH - (rows * (pxH + 20) - 20)) / 2;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (pxW + 20);
      const y = startY + r * (pxH + 20);
      shCtx.drawImage(single, x, y);
      // Light border
      shCtx.strokeStyle = '#ddd';
      shCtx.lineWidth = 1;
      shCtx.strokeRect(x, y, pxW, pxH);
    }
  }
  
  // Cut lines
  shCtx.setLineDash([10, 5]);
  shCtx.strokeStyle = '#ccc';
  shCtx.lineWidth = 0.5;
  for (let r = 0; r <= rows; r++) {
    const y = startY + r * (pxH + 20) - 10;
    shCtx.beginPath(); shCtx.moveTo(0, y); shCtx.lineTo(sheetW, y); shCtx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    const x = startX + c * (pxW + 20) - 10;
    shCtx.beginPath(); shCtx.moveTo(x, 0); shCtx.lineTo(x, sheetH); shCtx.stroke();
  }
  
  onProgress(90, 'Finalizing...');
  const blob = await new Promise(r => sheet.toBlob(r, 'image/jpeg', 0.95));
  
  // Preview
  const previewCanvas = document.createElement('canvas');
  const previewScale = Math.min(600 / sheetW, 400 / sheetH);
  previewCanvas.width = sheetW * previewScale;
  previewCanvas.height = sheetH * previewScale;
  previewCanvas.getContext('2d').drawImage(sheet, 0, 0, previewCanvas.width, previewCanvas.height);
  
  return {
    blob,
    filename: 'passport_photos.jpg',
    previewHtml: `<img src="${previewCanvas.toDataURL()}" style="max-width:100%;border-radius:8px;border:1px solid var(--border)"/><p class="result-info" style="margin-top:12px">📸 ${size.label} — ${cols * rows} photos on 4×6 print sheet (300 DPI)</p>`,
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
