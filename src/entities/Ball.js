import * as THREE from 'three';
import { BALL_RADIUS } from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import { createSoccerTexture } from '../utils/textures.js';

export class Ball {
  constructor(scene, physicsBody) {
    this.body = physicsBody;
    this.scene = scene;

    const geo = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
    const mat = new THREE.MeshStandardMaterial({
      map: createSoccerTexture(),
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x222018,
      emissiveIntensity: 0.35,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    setShadow(this.mesh, true, false);
    scene.add(this.mesh);

    const rim = new THREE.Mesh(
      new THREE.IcosahedronGeometry(BALL_RADIUS * 1.06, 1),
      new THREE.MeshBasicMaterial({
        color: 0xfff3c8,
        transparent: true,
        opacity: 0.16,
        wireframe: true,
      })
    );
    this.mesh.add(rim);

    this.trail = [];
    this.trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.5, 6, 6);
    this.trailMeshes = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(this.trailGeo, new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.3,
      }));
      m.visible = false;
      scene.add(m);
      this.trailMeshes.push(m);
    }
    this.showTrail = false;
    this.trailColor = 0xffcc00;
    this.autoTrailUntil = 0;
  }

  setTrail(active, color = 0xffcc00, duration = 0) {
    this.showTrail = active;
    this.trailColor = color;
    this.autoTrailUntil = duration > 0 ? performance.now() + duration * 1000 : 0;
  }

  update() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    if (this.autoTrailUntil && performance.now() > this.autoTrailUntil) {
      this.showTrail = false;
      this.autoTrailUntil = 0;
    }

    const speed = this.body.velocity.length();
    if (this.showTrail && speed > 8) {
      this.trail.unshift(this.mesh.position.clone());
      if (this.trail.length > this.trailMeshes.length) this.trail.pop();
    } else if (!this.showTrail) {
      this.trail = [];
    }

    for (let i = 0; i < this.trailMeshes.length; i++) {
      if (i < this.trail.length) {
        this.trailMeshes[i].position.copy(this.trail[i]);
        this.trailMeshes[i].material.opacity = 0.35 * (1 - i / this.trailMeshes.length);
        this.trailMeshes[i].material.color.setHex(this.trailColor);
        this.trailMeshes[i].visible = true;
        this.trailMeshes[i].scale.setScalar(1 - i * 0.1);
      } else {
        this.trailMeshes[i].visible = false;
      }
    }
  }

  getPosition() {
    return new THREE.Vector3().copy(this.body.position);
  }

  getVelocity() {
    return new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
  }
}
