import * as THREE from 'three';

export const GhostTrailShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 0.5 },
    color: { value: new THREE.Color(0x00ff88) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float opacity;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      float dist = length(vUv - vec2(0.5));
      float alpha = smoothstep(0.5, 0.1, dist) * opacity;
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

export class GhostTrailEffect {
  constructor(scene) {
    this.scene = scene;
    this.ghosts = [];
  }

  spawn(position, color, scale = 1) {
    const geo = new THREE.PlaneGeometry(1.2 * scale, 2.0 * scale);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.7 },
        color: { value: new THREE.Color(color) },
      },
      vertexShader: GhostTrailShader.vertexShader,
      fragmentShader: GhostTrailShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 1;
    mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 1);
    this.scene.add(mesh);

    this.ghosts.push({ mesh, life: 1.0 });
  }

  update(dt) {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life -= dt * 2.5;
      g.mesh.material.uniforms.opacity.value = g.life * 0.7;
      g.mesh.scale.x += dt * 0.5;

      if (g.life <= 0) {
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.ghosts.splice(i, 1);
      }
    }
  }
}
