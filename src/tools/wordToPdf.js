// Word to PDF — Convert DOCX to PDF using mammoth + jsPDF
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

export async function process(files, options, onProgress) {
  onProgress(15, 'Reading Word document...');
  const arrayBuf = await files[0].arrayBuffer();
  
  onProgress(30, 'Converting to HTML...');
  const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuf });
  const html = result.value;
  
  onProgress(50, 'Rendering PDF...');
  
  // Create a temporary container to render the HTML
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:595px;padding:40px;font-family:serif;font-size:12pt;line-height:1.6;color:#000;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);
  
  // Use jsPDF html method
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  
  await pdf.html(container, {
    callback: () => {},
    x: 0,
    y: 0,
    width: 515,
    windowWidth: 595,
    autoPaging: 'text',
  });
  
  document.body.removeChild(container);
  
  onProgress(90, 'Generating PDF...');
  const blob = pdf.output('blob');
  
  return {
    blob,
    filename: files[0].name.replace(/\.docx?$/i, '') + '.pdf',
    previewHtml: `<div style="max-height:300px;overflow-y:auto;padding:20px;background:#fff;color:#000;border-radius:8px;font-family:serif;font-size:11pt;line-height:1.6;text-align:left">${html.substring(0, 3000)}${html.length > 3000 ? '...' : ''}</div>`,
  };
}
