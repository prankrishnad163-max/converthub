// Image Crop — Interactive canvas-based cropper with aspect ratios
export async function process(files, options, onProgress) {
  onProgress(20, 'Loading image...');
  const img = await loadImage(files[0]);
  
  onProgress(50, 'Preparing cropper...');
  
  return new Promise((resolve) => {
    const workspace = document.getElementById('crop-workspace');
    const container = document.getElementById('tool-panel-body');
    
    // Hide dropzone and show crop workspace
    document.getElementById('dropzone').style.display = 'none';
    document.getElementById('file-list').style.display = 'none';
    document.getElementById('process-btn').style.display = 'none';
    document.getElementById('progress-container').style.display = 'none';
    document.getElementById('tool-options').style.display = 'none';
    workspace.style.display = '';
    
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    
    // Scale image to fit
    const maxW = Math.min(container.clientWidth - 40, 760);
    const maxH = 500;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    
    // Crop state
    let crop = { x: canvas.width * 0.1, y: canvas.height * 0.1, w: canvas.width * 0.8, h: canvas.height * 0.8 };
    let dragging = false, dragType = null, startX = 0, startY = 0, startCrop = {};
    const ratio = options.ratio || 'free';
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Darken outside crop
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, crop.y);
      ctx.fillRect(0, crop.y, crop.x, crop.h);
      ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h);
      ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h);
      
      // Crop border
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
      
      // Grid lines (rule of thirds)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(crop.x + crop.w * i / 3, crop.y);
        ctx.lineTo(crop.x + crop.w * i / 3, crop.y + crop.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(crop.x, crop.y + crop.h * i / 3);
        ctx.lineTo(crop.x + crop.w, crop.y + crop.h * i / 3);
        ctx.stroke();
      }
      
      // Corner handles
      const hs = 8;
      ctx.fillStyle = '#06b6d4';
      [[crop.x, crop.y], [crop.x + crop.w, crop.y], [crop.x, crop.y + crop.h], [crop.x + crop.w, crop.y + crop.h]].forEach(([cx, cy]) => {
        ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
      });
      
      // Size label
      const realW = Math.round(crop.w / scale);
      const realH = Math.round(crop.h / scale);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(crop.x + crop.w/2 - 40, crop.y + crop.h - 28, 80, 22);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${realW} × ${realH}`, crop.x + crop.w/2, crop.y + crop.h - 12);
    }
    
    function getHandle(mx, my) {
      const hs = 12;
      const corners = [
        { type: 'tl', x: crop.x, y: crop.y },
        { type: 'tr', x: crop.x + crop.w, y: crop.y },
        { type: 'bl', x: crop.x, y: crop.y + crop.h },
        { type: 'br', x: crop.x + crop.w, y: crop.y + crop.h },
      ];
      for (const c of corners) {
        if (Math.abs(mx - c.x) < hs && Math.abs(my - c.y) < hs) return c.type;
      }
      if (mx > crop.x && mx < crop.x + crop.w && my > crop.y && my < crop.y + crop.h) return 'move';
      return null;
    }
    
    function applyRatio() {
      if (ratio === 'free') return;
      const [rw, rh] = ratio.split(':').map(Number);
      const targetRatio = rw / rh;
      const currentRatio = crop.w / crop.h;
      if (currentRatio > targetRatio) {
        crop.w = crop.h * targetRatio;
      } else {
        crop.h = crop.w / targetRatio;
      }
    }
    
    canvas.onmousedown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      dragType = getHandle(mx, my);
      if (dragType) {
        dragging = true;
        startX = mx; startY = my;
        startCrop = { ...crop };
      }
    };
    
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      if (!dragging) {
        const h = getHandle(mx, my);
        canvas.style.cursor = h === 'move' ? 'move' : h ? (h === 'tl' || h === 'br' ? 'nwse-resize' : 'nesw-resize') : 'crosshair';
        return;
      }
      
      const dx = mx - startX;
      const dy = my - startY;
      
      if (dragType === 'move') {
        crop.x = Math.max(0, Math.min(canvas.width - crop.w, startCrop.x + dx));
        crop.y = Math.max(0, Math.min(canvas.height - crop.h, startCrop.y + dy));
      } else {
        if (dragType.includes('r')) crop.w = Math.max(20, startCrop.w + dx);
        if (dragType.includes('l')) { crop.x = startCrop.x + dx; crop.w = Math.max(20, startCrop.w - dx); }
        if (dragType.includes('b')) crop.h = Math.max(20, startCrop.h + dy);
        if (dragType.includes('t')) { crop.y = startCrop.y + dy; crop.h = Math.max(20, startCrop.h - dy); }
        applyRatio();
      }
      
      // Clamp
      crop.x = Math.max(0, crop.x);
      crop.y = Math.max(0, crop.y);
      if (crop.x + crop.w > canvas.width) crop.w = canvas.width - crop.x;
      if (crop.y + crop.h > canvas.height) crop.h = canvas.height - crop.y;
      
      draw();
    };
    
    canvas.onmouseup = () => { dragging = false; };
    canvas.onmouseleave = () => { dragging = false; };
    
    // Ratio chips (re-bind)
    const ratioChips = document.querySelectorAll('#ratio-chips .option-chip');
    // We handle ratio from options already
    
    // Controls
    const controls = document.getElementById('crop-controls');
    controls.innerHTML = `
      <div class="option-chips" style="flex:1">
        <button class="option-chip ${ratio==='free'?'active':''}" data-r="free">Free</button>
        <button class="option-chip ${ratio==='1:1'?'active':''}" data-r="1:1">1:1</button>
        <button class="option-chip ${ratio==='4:3'?'active':''}" data-r="4:3">4:3</button>
        <button class="option-chip ${ratio==='16:9'?'active':''}" data-r="16:9">16:9</button>
        <button class="option-chip ${ratio==='3:2'?'active':''}" data-r="3:2">3:2</button>
        <button class="option-chip ${ratio==='9:16'?'active':''}" data-r="9:16">9:16</button>
      </div>
      <button class="download-btn" id="crop-download-btn" style="margin-top:8px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Crop & Download</span>
      </button>
    `;
    
    // Ratio chip click
    controls.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        controls.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        options.ratio = chip.dataset.r;
        if (chip.dataset.r !== 'free') {
          const [rw, rh] = chip.dataset.r.split(':').map(Number);
          crop.h = crop.w / (rw / rh);
          if (crop.y + crop.h > canvas.height) crop.h = canvas.height - crop.y;
          crop.w = crop.h * (rw / rh);
        }
        draw();
      });
    });
    
    // Download
    controls.querySelector('#crop-download-btn').addEventListener('click', () => {
      const out = document.createElement('canvas');
      out.width = Math.round(crop.w / scale);
      out.height = Math.round(crop.h / scale);
      out.getContext('2d').drawImage(img,
        crop.x / scale, crop.y / scale, crop.w / scale, crop.h / scale,
        0, 0, out.width, out.height
      );
      out.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = files[0].name.replace(/\.[^.]+$/, '') + '_cropped.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    });
    
    applyRatio();
    draw();
    onProgress(100, 'Ready to crop!');
    
    // Don't resolve — user will download directly from crop UI
    // Resolve with a dummy to clear progress
    resolve({
      blob: new Blob([''], { type: 'text/plain' }),
      filename: 'cropped.png',
      previewHtml: '',
    });
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
