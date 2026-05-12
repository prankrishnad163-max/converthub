// Image Compress — Reduce image file size using Canvas API
import JSZip from 'jszip';

export async function process(files, options, onProgress) {
  const quality = options.quality || 0.6;
  const format = options.format || 'jpeg';
  const mimeType = `image/${format}`;
  const ext = format === 'jpeg' ? 'jpg' : format;
  
  if (files.length === 1) {
    onProgress(20, 'Loading image...');
    const img = await loadImage(files[0]);
    
    onProgress(50, 'Compressing...');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const blob = await new Promise(r => canvas.toBlob(r, mimeType, quality));
    
    onProgress(90, 'Done!');
    const previewUrl = URL.createObjectURL(blob);
    const origSize = files[0].size;
    const newSize = blob.size;
    const pct = ((1 - newSize / origSize) * 100).toFixed(1);
    
    return {
      blob,
      filename: files[0].name.replace(/\.[^.]+$/, '') + '_compressed.' + ext,
      previewHtml: `<img src="${previewUrl}" style="max-width:100%;border-radius:8px"/><p class="result-info" style="margin-top:12px">Original: ${fmtSize(origSize)} → Compressed: ${fmtSize(newSize)} (${pct}% smaller)</p>`,
    };
  }
  
  // Multiple files → ZIP
  const zip = new JSZip();
  let totalOrig = 0, totalNew = 0;
  
  for (let i = 0; i < files.length; i++) {
    onProgress(10 + (80 * (i + 1) / files.length), `Compressing ${i + 1} of ${files.length}...`);
    const img = await loadImage(files[i]);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, mimeType, quality));
    totalOrig += files[i].size;
    totalNew += blob.size;
    const ab = await blob.arrayBuffer();
    zip.file(files[i].name.replace(/\.[^.]+$/, '') + '_compressed.' + ext, ab);
  }
  
  onProgress(92, 'Creating ZIP...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const pct = ((1 - totalNew / totalOrig) * 100).toFixed(1);
  
  return {
    blob: zipBlob,
    filename: 'compressed_images.zip',
    previewHtml: `<p class="result-info">✅ Compressed ${files.length} images<br>Total: ${fmtSize(totalOrig)} → ${fmtSize(totalNew)} (${pct}% smaller)</p>`,
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

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
