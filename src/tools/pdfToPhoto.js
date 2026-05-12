// PDF to Photo — Render PDF pages as images using PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function process(files, options, onProgress) {
  const format = options.imageFormat || 'png';
  const scale = options.scale || 2;
  
  onProgress(15, 'Loading PDF...');
  const arrayBuf = await files[0].arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const numPages = pdf.numPages;
  
  const zip = new JSZip();
  let firstPageUrl = null;
  
  for (let i = 1; i <= numPages; i++) {
    onProgress(15 + (75 * i / numPages), `Rendering page ${i} of ${numPages}...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    
    if (i === 1) firstPageUrl = dataUrl;
    
    // Add to zip
    const b64 = dataUrl.split(',')[1];
    zip.file(`page_${i}.${ext}`, b64, { base64: true });
  }
  
  onProgress(92, 'Creating ZIP...');
  const blob = await zip.generateAsync({ type: 'blob' });
  
  return {
    blob,
    filename: 'pdf_images.zip',
    previewUrl: firstPageUrl,
  };
}
