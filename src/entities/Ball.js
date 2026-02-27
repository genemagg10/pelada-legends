import * as THREE from 'three';
import { BALL_RADIUS } from '../constants.js';

export class Ball {
  constructor(scene, physicsBody) {
    this.body = physicsBody;

    // Ball mesh - white with black pentagon pattern approximation
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Trail effect
    this.trail = [];
    this.trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.5, 6, 6);
    this.trailMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.3,
    });
    this.trailMeshes = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(this.trailGeo, this.trailMat.clone());
      m.visible = false;
      scene.add(m);
      this.trailMeshes.push(m);
    }
    this.scene = scene;
    this.showTrail = false;
    this.trailColor = 0xffcc00;
  }

  setTrail(active, color = 0xffcc00) {
    this.showTrail = active;
    this.trailColor = color;
  }

  update() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // Update trail
    const speed = this.body.velocity.length();
    if (this.showTrail && speed > 8) {
      this.trail.unshift(this.mesh.position.clone());
      if (this.trail.length > this.trailMeshes.length) {
        this.trail.pop();
      }
    } else if (!this.showTrail) {
      this.trail = [];
    }

    for (let i = 0; i < this.trailMeshes.length; i++) {
      if (i < this.trail.length) {
        this.trailMeshes[i].position.copy(this.trail[i]);
        this.trailMeshes[i].material.opacity = 0.3 * (1 - i / this.trailMeshes.length);
        this.trailMeshes[i].material.color.setHex(this.trailColor);
        this.trailMeshes[i].visible = true;
        const s = 1 - i * 0.1;
        this.trailMeshes[i].scale.setScalar(s);
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
