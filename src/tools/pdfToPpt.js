// PDF to PPT — Convert PDF pages into PowerPoint slides
import * as pdfjsLib from 'pdfjs-dist';
import PptxGenJS from 'pptxgenjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function process(files, options, onProgress) {
  onProgress(15, 'Loading PDF...');
  const arrayBuf = await files[0].arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const numPages = pdf.numPages;
  
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  
  for (let i = 1; i <= numPages; i++) {
    onProgress(15 + (70 * i / numPages), `Rendering page ${i} of ${numPages}...`);
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    const slide = pptx.addSlide();
    slide.addImage({
      data: dataUrl,
      x: 0, y: 0, w: '100%', h: '100%',
    });
  }
  
  onProgress(90, 'Generating PowerPoint...');
  const blob = await pptx.write({ outputType: 'blob' });
  
  return {
    blob: new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
    filename: files[0].name.replace(/\.pdf$/i, '') + '.pptx',
    previewHtml: `<p class="result-info">✅ Created ${numPages} slides from PDF</p>`,
  };
}
