import * as THREE from 'three';

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function hashColor(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function createConcreteTexture(size = 512) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#a89878';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = hashColor(i + 2) * size;
    const y = hashColor(i + 9) * size;
    const r = 4 + hashColor(i + 17) * 28;
    const shade = 90 + hashColor(i + 31) * 55;
    ctx.fillStyle = `rgba(${shade + 20},${shade},${shade - 12},${0.04 + hashColor(i) * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(40, 28, 18, 0.18)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(hashColor(i + 40) * size, hashColor(i + 70) * size);
    ctx.lineTo(hashColor(i + 90) * size, hashColor(i + 110) * size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBrickTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#6a3a2c';
  ctx.fillRect(0, 0, size, size);

  const bw = 42;
  const bh = 18;
  for (let y = 0, row = 0; y < size; y += bh + 3, row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < size; x += bw + 3) {
      const n = (x + 3) * (y + 7);
      const r = 130 + hashColor(n) * 50;
      const g = 55 + hashColor(n + 4) * 30;
      const b = 40 + hashColor(n + 8) * 20;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + offset, y, bw, bh);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGraffitiTexture(label, accentHex, size = 256) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(10, 6, 2, 0.15)';
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size * 0.08, size * 0.18);
  ctx.rotate(-0.08);
  ctx.font = '900 54px "Permanent Marker", Impact, cursive';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#111';
  ctx.strokeText(label, 8, 70);
  ctx.fillStyle = accentHex;
  ctx.fillText(label, 8, 70);
  ctx.restore();

  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 150);
  ctx.bezierCurveTo(80, 120, 140, 200, 220, 160);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = accentHex;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(40 + i * 28, 210 + Math.sin(i) * 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSoccerTexture(size = 256) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#f0ebe0';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 4;
  const centers = [
    [128, 40], [40, 110], [216, 110], [70, 210], [186, 210],
    [128, 128], [20, 20], [236, 20], [20, 236], [236, 236],
  ];

  for (const [cx, cy] of centers) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2) / 5;
      const x = cx + Math.cos(a) * 22;
      const y = cy + Math.sin(a) * 22;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 62);
  ctx.lineTo(128, 106);
  ctx.moveTo(62, 120);
  ctx.lineTo(106, 128);
  ctx.moveTo(194, 120);
  ctx.lineTo(150, 128);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createJerseyMark(letter, ink = '#111111') {
  const { canvas, ctx } = makeCanvas(64);
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = ink;
  ctx.font = '900 38px "Russo One", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createYouSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 48);
  ctx.font = '700 28px "Permanent Marker", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#7a2a00';
  ctx.lineWidth = 6;
  ctx.strokeText('YOU', 64, 26);
  ctx.fillStyle = '#ffcc00';
  ctx.fillText('YOU', 64, 26);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
