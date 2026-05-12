// Photo to PDF — Convert multiple images to a single PDF
import { jsPDF } from 'jspdf';

export async function process(files, options, onProgress) {
  onProgress(20, 'Loading images...');
  const images = await Promise.all(files.map(f => loadImage(f)));
  
  onProgress(40, 'Creating PDF...');
  let pdf = null;
  
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const orientation = w > h ? 'landscape' : 'portrait';
    
    if (i === 0) {
      pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
    } else {
      pdf.addPage([w, h], orientation);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
    
    onProgress(40 + (50 * (i + 1) / images.length), `Processing image ${i + 1} of ${images.length}...`);
  }
  
  onProgress(95, 'Generating PDF...');
  const blob = pdf.output('blob');
  
  // Preview first page
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = Math.min(images[0].naturalWidth, 600);
  const scale = previewCanvas.width / images[0].naturalWidth;
  previewCanvas.height = images[0].naturalHeight * scale;
  previewCanvas.getContext('2d').drawImage(images[0], 0, 0, previewCanvas.width, previewCanvas.height);
  
  return {
    blob,
    filename: 'converted.pdf',
    previewUrl: previewCanvas.toDataURL(),
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
