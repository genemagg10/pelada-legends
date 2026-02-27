import * as THREE from 'three';

export class DustParticleSystem {
  constructor(scene, count = 200) {
    this.scene = scene;
    this.count = count;
    this.particles = [];
    this.poolIndex = 0;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      alphas[i] = 0;
      this.particles.push({ active: false, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xddbb88) },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(geo, mat);
    this.scene.add(this.mesh);
    this.posAttr = geo.getAttribute('position');
    this.sizeAttr = geo.getAttribute('size');
    this.alphaAttr = geo.getAttribute('alpha');
  }

  emit(x, y, z, count = 5) {
    for (let i = 0; i < count; i++) {
      const idx = this.poolIndex % this.count;
      this.poolIndex++;

      const p = this.particles[idx];
      p.active = true;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.6;
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = 1 + Math.random() * 2;
      p.vz = (Math.random() - 0.5) * 3;

      this.posAttr.setXYZ(idx, x + (Math.random() - 0.5), y + 0.1, z + (Math.random() - 0.5));
      this.sizeAttr.setX(idx, 2 + Math.random() * 3);
      this.alphaAttr.setX(idx, 0.6);
    }
    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.posAttr.setY(i, -100);
        this.alphaAttr.setX(i, 0);
        continue;
      }

      const t = p.life / p.maxLife;
      const x = this.posAttr.getX(i) + p.vx * dt;
      const y = this.posAttr.getY(i) + p.vy * dt;
      const z = this.posAttr.getZ(i) + p.vz * dt;
      this.posAttr.setXYZ(i, x, y, z);
      this.alphaAttr.setX(i, (1 - t) * 0.6);

      p.vy -= 4 * dt;
    }
    this.posAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }
}
