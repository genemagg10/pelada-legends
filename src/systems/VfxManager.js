import * as THREE from 'three';

/**
 * Lightweight match cosmetics: impact discs, shockwaves, colored bursts.
 * Does not touch physics impulses.
 */
export class VfxManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  impactDisc(x, z, color = 0xfff3c8, scale = 1) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.03, z);
    this.scene.add(mesh);
    this.items.push({ mesh, life: 0, duration: 0.28, grow: 2.4 * scale, kind: 'disc' });
  }

  shockwave(x, z, color = 0xffcc00) {
    this._ring(x, 0.05, z, color, 0.32, 0.52, 0.4, 7.2, 'wave');
  }

  specialBurst(x, y, z, color = 0xffcc00) {
    this.impactDisc(x, z, color, 1.45);
    this._ring(x, 0.04, z, color, 0.28, 0.5, 0.44, 8.4, 'wave');
    this._ring(x, 0.09, z, color, 0.12, 0.26, 0.28, 4.6, 'wave');

    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.055, 8, 28),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(x, 0.14, z);
    this.scene.add(hoop);
    this.items.push({ mesh: hoop, life: 0, duration: 0.4, grow: 7.6, kind: 'wave' });

    const upright = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.58, 28),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    upright.position.set(x, y || 0.75, z);
    upright.rotation.y = Math.random() * Math.PI;
    this.scene.add(upright);
    this.items.push({ mesh: upright, life: 0, duration: 0.34, grow: 4.8, kind: 'hoop' });

    this.burst(x, y || 0.9, z, color, 22);
  }

  _ring(x, y, z, color, inner, outer, duration, grow, kind) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.items.push({ mesh, life: 0, duration, grow, kind });
  }

  burst(x, y, z, color = 0xffcc00, count = 14) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        0.4 + Math.random(),
        Math.random() - 0.5
      ).normalize().multiplyScalar(6 + Math.random() * 6);
      velocities.push(dir);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color,
        size: 0.22,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    this.scene.add(points);
    this.items.push({
      mesh: points, life: 0, duration: 0.32, kind: 'burst', velocities,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const fx = this.items[i];
      fx.life += dt;
      const t = fx.life / fx.duration;
      if (t >= 1) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.items.splice(i, 1);
        continue;
      }

      if (fx.kind === 'disc' || fx.kind === 'wave' || fx.kind === 'hoop') {
        const s = 1 + t * fx.grow;
        fx.mesh.scale.setScalar(s);
        const base = fx.kind === 'disc' ? 0.65 : 0.88;
        fx.mesh.material.opacity = (1 - t) * base;
        if (fx.kind === 'hoop') fx.mesh.position.y += 1.6 * dt;
      } else if (fx.kind === 'burst') {
        const pos = fx.mesh.geometry.getAttribute('position');
        for (let p = 0; p < fx.velocities.length; p++) {
          pos.setX(p, pos.getX(p) + fx.velocities[p].x * dt);
          pos.setY(p, pos.getY(p) + fx.velocities[p].y * dt);
          pos.setZ(p, pos.getZ(p) + fx.velocities[p].z * dt);
          fx.velocities[p].y -= 10 * dt;
        }
        pos.needsUpdate = true;
        fx.mesh.material.opacity = 1 - t;
      }
    }
  }
}
