import './style.css';

// ============================================
// Tool Definitions (metadata only — processing code is lazy-loaded)
// ============================================
const TOOLS = [
  { id:'photo-to-pdf', name:'Photo to PDF', desc:'Convert images to a single PDF file', icon:'🖼️', category:'converter', accept:'.jpg,.jpeg,.png,.webp,.bmp,.gif', multiple:true, btnText:'Convert to PDF' },
  { id:'pdf-to-photo', name:'PDF to Images', desc:'Convert each PDF page to JPG or PNG', icon:'📸', category:'converter', accept:'.pdf', multiple:false, btnText:'Convert to Images' },
  { id:'word-to-pdf', name:'Word to PDF', desc:'Convert DOCX documents to PDF', icon:'📝', category:'converter', accept:'.docx', multiple:false, btnText:'Convert to PDF' },
  { id:'pdf-to-word', name:'PDF to Word', desc:'Extract text from PDF and create DOCX', icon:'📄', category:'converter', accept:'.pdf', multiple:false, btnText:'Convert to Word' },
  { id:'ppt-to-pdf', name:'PPT to PDF', desc:'Convert PowerPoint slides to PDF', icon:'📊', category:'converter', accept:'.pptx', multiple:false, btnText:'Convert to PDF' },
  { id:'pdf-to-ppt', name:'PDF to PPT', desc:'Convert PDF pages into PowerPoint slides', icon:'🎞️', category:'converter', accept:'.pdf', multiple:false, btnText:'Convert to PPT' },
  { id:'image-compress', name:'Compress Image', desc:'Reduce image file size in any format', icon:'🗜️', category:'compress', accept:'.jpg,.jpeg,.png,.webp,.bmp', multiple:true, btnText:'Compress' },
  { id:'pdf-compress', name:'Compress PDF', desc:'Reduce PDF file size to any custom size', icon:'📦', category:'compress', accept:'.pdf', multiple:false, btnText:'Compress PDF' },
  { id:'passport-photo', name:'Passport Photo', desc:'Create standard passport size photos', icon:'🪪', category:'photo', accept:'.jpg,.jpeg,.png,.webp', multiple:false, btnText:'Generate Photos' },
  { id:'image-crop', name:'Image Crop', desc:'Crop images in any aspect ratio', icon:'✂️', category:'photo', accept:'.jpg,.jpeg,.png,.webp,.bmp', multiple:false, btnText:'Crop & Download' },
];

// ============================================
// App State
// ============================================
let currentTool = null;
let selectedFiles = [];
let resultBlob = null;
let resultName = '';

// ============================================
// DOM
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderToolCards();
  initCategoryTabs();
  initToolPanel();
  initParticles();
  initScrollReveal();
});

// ============================================
// Render Tool Cards
// ============================================
function renderToolCards() {
  const grid = $('#tools-grid');
  grid.innerHTML = TOOLS.map((t, i) => `
    <div class="tool-card reveal" data-tool="${t.id}" data-category="${t.category}" style="animation-delay:${i * 0.06}s" id="tool-${t.id}">
      <div class="tool-card-icon">${t.icon}</div>
      <h3 class="tool-card-name">${t.name}</h3>
      <p class="tool-card-desc">${t.desc}</p>
      <div class="tool-card-arrow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7.8H7.8"/></svg>
      </div>
    </div>
  `).join('');

  // 3D tilt on hover
  grid.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
      const y = ((e.clientY - r.top) / r.height - 0.5) * -12;
      card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
    card.addEventListener('click', () => openTool(card.dataset.tool));
  });
}

// ============================================
// Category Tabs
// ============================================
function initCategoryTabs() {
  $$('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.category;
      $$('.tool-card').forEach(card => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.classList.remove('hidden');
          card.classList.add('reveal');
        } else {
          card.classList.add('hidden');
          card.classList.remove('reveal');
        }
      });
    });
  });
}

// ============================================
// Tool Panel
// ============================================
function initToolPanel() {
  $('#back-btn').addEventListener('click', closeTool);
  
  // Dropzone events
  const dz = $('#dropzone');
  const fi = $('#file-input');

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fi.addEventListener('change', () => { handleFiles(fi.files); fi.value = ''; });

  $('#process-btn').addEventListener('click', processFiles);
}

function openTool(toolId) {
  currentTool = TOOLS.find(t => t.id === toolId);
  if (!currentTool) return;
  selectedFiles = [];
  resultBlob = null;

  // Set panel content
  $('#tool-panel-title').textContent = currentTool.name;
  $('#tool-panel-desc').textContent = currentTool.desc;
  $('#dropzone-formats').textContent = `Supported: ${currentTool.accept}`;
  $('#file-input').setAttribute('accept', currentTool.accept);
  if (currentTool.multiple) $('#file-input').setAttribute('multiple', '');
  else $('#file-input').removeAttribute('multiple');

  // Reset UI
  $('#file-list').style.display = 'none';
  $('#file-list').innerHTML = '';
  $('#tool-options').style.display = 'none';
  $('#tool-options').innerHTML = '';
  $('#process-btn').style.display = 'none';
  $('#process-btn').classList.remove('loading');
  $('#process-btn').querySelector('.process-btn-text').textContent = currentTool.btnText;
  $('#progress-container').style.display = 'none';
  $('#progress-fill').style.width = '0%';
  $('#result-container').style.display = 'none';
  $('#crop-workspace').style.display = 'none';
  $('#passport-workspace').style.display = 'none';
  $('#dropzone').style.display = '';

  // Open panel
  $('#tool-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTool() {
  $('#tool-panel').classList.remove('open');
  document.body.style.overflow = '';
  currentTool = null;
  selectedFiles = [];
}

// ============================================
// File Handling
// ============================================
function handleFiles(fileList) {
  if (!currentTool) return;
  const files = Array.from(fileList);
  if (currentTool.multiple) {
    selectedFiles.push(...files);
  } else {
    selectedFiles = [files[0]];
  }
  renderFileList();
  showToolOptions();
  $('#process-btn').style.display = '';
  $('#result-container').style.display = 'none';
  $('#progress-container').style.display = 'none';
}

function renderFileList() {
  const fl = $('#file-list');
  fl.style.display = '';
  fl.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-item">
      <span class="file-item-name">${f.name}</span>
      <span class="file-item-size">${formatSize(f.size)}</span>
      <button class="file-item-remove" data-index="${i}" title="Remove">✕</button>
    </div>
  `).join('');
  fl.querySelectorAll('.file-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(parseInt(btn.dataset.index), 1);
      renderFileList();
      if (selectedFiles.length === 0) {
        fl.style.display = 'none';
        $('#process-btn').style.display = 'none';
        $('#tool-options').style.display = 'none';
      }
    });
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

// ============================================
// Tool Options (per tool)
// ============================================
function showToolOptions() {
  const opts = $('#tool-options');
  let html = '';
  switch(currentTool.id) {
    case 'image-compress':
      html = `<div class="option-group"><label class="option-label">Quality (%)</label>
        <input type="range" id="opt-quality" min="5" max="100" value="60" class="option-input" style="padding:4px"/>
        <span id="opt-quality-val" style="color:var(--cyan);font-size:0.9rem;margin-top:4px;display:block">60%</span></div>
        <div class="option-group"><label class="option-label">Output Format</label>
        <select id="opt-format" class="option-select"><option value="jpeg">JPEG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div>`;
      break;
    case 'pdf-compress':
      html = `<div class="option-group"><label class="option-label">Target Size</label>
        <div class="option-chips" id="size-chips">
          <button class="option-chip active" data-val="100">100 KB</button>
          <button class="option-chip" data-val="200">200 KB</button>
          <button class="option-chip" data-val="500">500 KB</button>
          <button class="option-chip" data-val="1000">1 MB</button>
          <button class="option-chip" data-val="custom">Custom</button>
        </div></div>
        <div class="option-group" id="custom-size-group" style="display:none">
          <label class="option-label">Custom Size (KB)</label>
          <input type="number" id="opt-custom-size" class="option-input" placeholder="Enter size in KB" min="10"/></div>`;
      break;
    case 'pdf-to-photo':
      html = `<div class="option-group"><label class="option-label">Image Format</label>
        <select id="opt-img-format" class="option-select"><option value="png">PNG</option><option value="jpeg">JPEG</option></select></div>
        <div class="option-group"><label class="option-label">Scale</label>
        <select id="opt-scale" class="option-select"><option value="1">1x (72 DPI)</option><option value="2" selected>2x (144 DPI)</option><option value="3">3x (216 DPI)</option></select></div>`;
      break;
    case 'passport-photo':
      html = `<div class="option-group"><label class="option-label">Photo Size Standard</label>
        <select id="opt-passport-size" class="option-select">
          <option value="2x2">US / India (2×2 inch)</option>
          <option value="35x45">UK / EU (35×45 mm)</option>
          <option value="33x48">Australia (35×48 mm)</option>
          <option value="custom">Custom Size</option></select></div>
        <div class="option-group" id="passport-custom" style="display:none">
          <div class="option-row">
            <div><label class="option-label">Width (mm)</label><input type="number" id="opt-pw" class="option-input" value="35"/></div>
            <div><label class="option-label">Height (mm)</label><input type="number" id="opt-ph" class="option-input" value="45"/></div>
          </div></div>
        <div class="option-group"><label class="option-label">Background Color</label>
        <div class="option-chips" id="bg-chips">
          <button class="option-chip active" data-val="#ffffff" style="background:#fff;color:#000;border-color:#ccc">White</button>
          <button class="option-chip" data-val="#d4e6f9" style="background:#d4e6f9;color:#000;border-color:#aac8e8">Blue</button>
          <button class="option-chip" data-val="#e0e0e0" style="background:#e0e0e0;color:#000;border-color:#bbb">Grey</button>
        </div></div>`;
      break;
    case 'image-crop':
      html = `<div class="option-group"><label class="option-label">Aspect Ratio</label>
        <div class="option-chips" id="ratio-chips">
          <button class="option-chip active" data-val="free">Free</button>
          <button class="option-chip" data-val="1:1">1:1</button>
          <button class="option-chip" data-val="4:3">4:3</button>
          <button class="option-chip" data-val="16:9">16:9</button>
          <button class="option-chip" data-val="3:2">3:2</button>
          <button class="option-chip" data-val="9:16">9:16</button>
        </div></div>`;
      break;
  }
  if (html) {
    opts.innerHTML = html;
    opts.style.display = '';
    initOptionListeners();
  }
}

function initOptionListeners() {
  // Quality slider
  const qs = $('#opt-quality');
  if (qs) qs.addEventListener('input', () => { $('#opt-quality-val').textContent = qs.value + '%'; });

  // Chip groups
  document.querySelectorAll('.option-chips').forEach(group => {
    group.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // Custom size toggle
        if (group.id === 'size-chips') {
          const cg = $('#custom-size-group');
          if (cg) cg.style.display = chip.dataset.val === 'custom' ? '' : 'none';
        }
        // Passport custom toggle
        if ($('#opt-passport-size')) {
          const pc = $('#passport-custom');
          if (pc) pc.style.display = $('#opt-passport-size').value === 'custom' ? '' : 'none';
        }
      });
    });
  });

  // Passport size dropdown
  const ps = $('#opt-passport-size');
  if (ps) ps.addEventListener('change', () => {
    const pc = $('#passport-custom');
    if (pc) pc.style.display = ps.value === 'custom' ? '' : 'none';
  });
}

// ============================================
// Process Files — Dynamic Import
// ============================================
async function processFiles() {
  if (!currentTool || selectedFiles.length === 0) return;
  const btn = $('#process-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  $('#progress-container').style.display = '';
  $('#result-container').style.display = 'none';

  const updateProgress = (pct, text) => {
    $('#progress-fill').style.width = pct + '%';
    if (text) $('#progress-text').textContent = text;
  };

  try {
    updateProgress(5, 'Loading tool...');
    let module;
    switch(currentTool.id) {
      case 'photo-to-pdf': module = await import('./tools/photoToPdf.js'); break;
      case 'pdf-to-photo': module = await import('./tools/pdfToPhoto.js'); break;
      case 'word-to-pdf': module = await import('./tools/wordToPdf.js'); break;
      case 'pdf-to-word': module = await import('./tools/pdfToWord.js'); break;
      case 'ppt-to-pdf': module = await import('./tools/pptToPdf.js'); break;
      case 'pdf-to-ppt': module = await import('./tools/pdfToPpt.js'); break;
      case 'image-compress': module = await import('./tools/imageCompress.js'); break;
      case 'pdf-compress': module = await import('./tools/pdfCompress.js'); break;
      case 'passport-photo': module = await import('./tools/passportPhoto.js'); break;
      case 'image-crop': module = await import('./tools/imageCrop.js'); break;
    }

    updateProgress(15, 'Processing...');
    const options = gatherOptions();
    const result = await module.process(selectedFiles, options, updateProgress);

    updateProgress(100, 'Done!');
    resultBlob = result.blob;
    resultName = result.filename;

    // Show result
    const rc = $('#result-container');
    const rp = $('#result-preview');
    rc.style.display = '';

    if (result.previewUrl) {
      rp.innerHTML = `<img src="${result.previewUrl}" alt="Preview"/>`;
    } else if (result.previewHtml) {
      rp.innerHTML = result.previewHtml;
    } else {
      rp.innerHTML = `<p class="result-info">✅ File ready! Size: ${formatSize(resultBlob.size)}</p>`;
    }

    // Download button
    const db = $('#download-btn');
    db.onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(resultBlob);
      a.download = resultName;
      a.click();
      URL.revokeObjectURL(a.href);
    };

  } catch(err) {
    console.error(err);
    $('#progress-text').textContent = '❌ Error: ' + (err.message || 'Something went wrong');
    $('#progress-fill').style.width = '100%';
    $('#progress-fill').style.background = 'var(--red)';
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function gatherOptions() {
  const o = {};
  const qv = $('#opt-quality');
  if (qv) o.quality = parseInt(qv.value) / 100;
  const fmt = $('#opt-format');
  if (fmt) o.format = fmt.value;
  const ifmt = $('#opt-img-format');
  if (ifmt) o.imageFormat = ifmt.value;
  const sc = $('#opt-scale');
  if (sc) o.scale = parseInt(sc.value);
  const ps = $('#opt-passport-size');
  if (ps) o.passportSize = ps.value;
  const pw = $('#opt-pw');
  if (pw) o.passportWidth = parseInt(pw.value);
  const ph = $('#opt-ph');
  if (ph) o.passportHeight = parseInt(ph.value);
  // Chips
  const bgChip = document.querySelector('#bg-chips .option-chip.active');
  if (bgChip) o.bgColor = bgChip.dataset.val;
  const sizeChip = document.querySelector('#size-chips .option-chip.active');
  if (sizeChip) o.targetSizeKB = sizeChip.dataset.val === 'custom' ? parseInt($('#opt-custom-size')?.value || 200) : parseInt(sizeChip.dataset.val);
  const ratioChip = document.querySelector('#ratio-chips .option-chip.active');
  if (ratioChip) o.ratio = ratioChip.dataset.val;
  return o;
}

// ============================================
// Particle Background
// ============================================
function initParticles() {
  const canvas = $('#particleCanvas');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*2+0.5, dx: (Math.random()-0.5)*0.4, dy: (Math.random()-0.5)*0.4,
      o: Math.random()*0.3+0.05
    });
  }

  function draw() {
    ctx.clearRect(0,0,w,h);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(99,102,241,${p.o})`;
      ctx.fill();
    });
    // Draw lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i+1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${0.06*(1-dist/120)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ============================================
// Scroll Reveal
// ============================================
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('reveal');
    });
  }, { threshold: 0.1 });
  $$('.tool-card, .faq-item').forEach(el => observer.observe(el));
}
