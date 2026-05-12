// PPT to PDF — Parse PPTX and convert slides to PDF
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

export async function process(files, options, onProgress) {
  onProgress(15, 'Reading PowerPoint...');
  const arrayBuf = await files[0].arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuf);
  
  onProgress(30, 'Parsing slides...');
  
  // Find slide files
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)[1]);
      const nb = parseInt(b.match(/slide(\d+)/)[1]);
      return na - nb;
    });
  
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [960, 540] });
  
  for (let i = 0; i < slideFiles.length; i++) {
    onProgress(30 + (55 * (i + 1) / slideFiles.length), `Processing slide ${i + 1}...`);
    
    if (i > 0) pdf.addPage([960, 540], 'landscape');
    
    const xmlStr = await zip.files[slideFiles[i]].async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    
    // Extract text content from slide
    const texts = [];
    const txBodyNodes = xmlDoc.querySelectorAll('txBody');
    txBodyNodes.forEach(tb => {
      const paras = tb.querySelectorAll('p');
      paras.forEach(p => {
        let line = '';
        p.querySelectorAll('r').forEach(r => {
          const t = r.querySelector('t');
          if (t) line += t.textContent;
        });
        if (line.trim()) texts.push(line.trim());
      });
    });
    
    // Render slide
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, 960, 540, 'F');
    
    // Slide number
    pdf.setFontSize(10);
    pdf.setTextColor(180, 180, 180);
    pdf.text(`Slide ${i + 1}`, 900, 530);
    
    // Content
    pdf.setTextColor(30, 30, 30);
    let y = 60;
    texts.forEach((text, idx) => {
      const fontSize = idx === 0 ? 28 : 16;
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, 860);
      lines.forEach(line => {
        if (y < 500) {
          pdf.text(line, 50, y);
          y += fontSize * 1.4;
        }
      });
      y += 10;
    });
    
    if (texts.length === 0) {
      pdf.setFontSize(14);
      pdf.setTextColor(150, 150, 150);
      pdf.text('(Slide content — images and shapes are not rendered)', 50, 270);
    }
  }
  
  onProgress(90, 'Generating PDF...');
  const blob = pdf.output('blob');
  
  return {
    blob,
    filename: files[0].name.replace(/\.pptx?$/i, '') + '.pdf',
    previewHtml: `<p class="result-info">✅ Converted ${slideFiles.length} slides to PDF</p>`,
  };
}
