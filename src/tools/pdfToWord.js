// PDF to Word — Extract text from PDF and create DOCX
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function process(files, options, onProgress) {
  onProgress(15, 'Loading PDF...');
  const arrayBuf = await files[0].arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const numPages = pdf.numPages;
  
  const pages = [];
  
  for (let i = 1; i <= numPages; i++) {
    onProgress(15 + (55 * i / numPages), `Extracting text from page ${i}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    let lines = [];
    let lastY = null;
    let currentLine = '';
    
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += item.str + ' ';
      lastY = item.transform[5];
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pages.push(lines);
  }
  
  onProgress(75, 'Creating Word document...');
  
  const children = [];
  pages.forEach((lines, pageIdx) => {
    lines.forEach((line, lineIdx) => {
      const runs = [new TextRun({ text: line, size: 24 })];
      if (pageIdx > 0 && lineIdx === 0) {
        runs.unshift(new PageBreak());
      }
      children.push(new Paragraph({ children: runs }));
    });
    if (lines.length === 0) {
      const runs = pageIdx > 0 ? [new PageBreak(), new TextRun('')] : [new TextRun('')];
      children.push(new Paragraph({ children: runs }));
    }
  });
  
  const doc = new Document({
    sections: [{ children }],
  });
  
  onProgress(90, 'Generating DOCX...');
  const blob = await Packer.toBlob(doc);
  
  const previewText = pages.map(p => p.join('\n')).join('\n\n--- Page Break ---\n\n');
  
  return {
    blob,
    filename: files[0].name.replace(/\.pdf$/i, '') + '.docx',
    previewHtml: `<div style="max-height:300px;overflow-y:auto;padding:20px;background:#fff;color:#000;border-radius:8px;font-family:serif;font-size:11pt;line-height:1.6;text-align:left;white-space:pre-wrap">${previewText.substring(0, 3000)}${previewText.length > 3000 ? '...' : ''}</div>`,
  };
}
