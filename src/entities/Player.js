import * as THREE from 'three';
import {
  PLAYER_SPEED, SPRINT_MULTIPLIER, BALL_POSSESSION_DIST,
  SHOOT_POWER, PASS_POWER, TEAM_HOME, TEAM_AWAY,
  COURT_WIDTH, COURT_LENGTH,
} from '../constants.js';

export class Player {
  constructor(scene, physicsBody, legendData, team, isHuman = false) {
    this.body = physicsBody;
    this.legend = legendData;
    this.team = team;
    this.isHuman = isHuman;
    this.scene = scene;

    // Visual representation
    const group = new THREE.Group();

    // Body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: team === TEAM_HOME ? 0xffcc00 : 0xff4444,
      roughness: 0.6,
      metalness: 0.1,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.7;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xddaa77,
      roughness: 0.7,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.7;
    headMesh.castShadow = true;
    group.add(headMesh);

    // Number on jersey (simple plane)
    const numberCanvas = document.createElement('canvas');
    numberCanvas.width = 64;
    numberCanvas.height = 64;
    const ctx = numberCanvas.getContext('2d');
    ctx.fillStyle = team === TEAM_HOME ? '#000' : '#fff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(legendData ? legendData.id.charAt(0).toUpperCase() : '?', 32, 32);

    const numberTex = new THREE.CanvasTexture(numberCanvas);
    const numberGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const numberMat = new THREE.MeshBasicMaterial({ map: numberTex, transparent: true });
    const numberMesh = new THREE.Mesh(numberGeo, numberMat);
    numberMesh.position.set(0, 1.1, -0.46);
    group.add(numberMesh);

    // Legend glow ring (for special move readiness)
    const ringGeo = new THREE.RingGeometry(0.6, 0.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: legendData ? legendData.color : 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.05;
    group.add(this.glowRing);

    // Indicator arrow (for human player)
    if (isHuman) {
      const arrowGeo = new THREE.ConeGeometry(0.3, 0.5, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      this.arrow = new THREE.Mesh(arrowGeo, arrowMat);
      this.arrow.position.y = 2.3;
      group.add(this.arrow);
    }

    this.mesh = group;
    scene.add(this.mesh);

    // Gameplay state
    this.hasBall = false;
    this.facingDir = new THREE.Vector3(0, 0, team === TEAM_HOME ? 1 : -1);
    this.moveDir = new THREE.Vector3();
    this.isSpecialActive = false;
    this.specialTimer = 0;
    this.originalMass = this.body.mass;

    // AI state
    this.aiRole = 'idle'; // 'attack', 'defend', 'support', 'idle'
    this.aiTarget = new THREE.Vector3();
    this.aiTimer = 0;
  }

  update(dt, ballPos) {
    // Sync visuals with physics
    this.mesh.position.set(this.body.position.x, 0, this.body.position.z);

    // Rotate to face movement/facing direction
    if (this.facingDir.lengthSq() > 0.01) {
      const angle = Math.atan2(this.facingDir.x, this.facingDir.z);
      this.mesh.rotation.y = angle;
    }

    // Glow ring pulse for special readiness
    if (this.glowRing) {
      const t = performance.now() * 0.003;
      this.glowRing.material.opacity = this.isSpecialActive ? 0.6 + Math.sin(t * 5) * 0.3 : 0;
    }

    // Arrow bob for human player
    if (this.arrow) {
      this.arrow.position.y = 2.3 + Math.sin(performance.now() * 0.004) * 0.15;
      this.arrow.rotation.y += dt * 3;
    }

    // Special move timer
    if (this.specialTimer > 0) {
      this.specialTimer -= dt;
      if (this.specialTimer <= 0) {
        this.deactivateSpecial();
      }
    }

    // Check ball possession
    if (ballPos) {
      const dist = new THREE.Vector3(this.body.position.x, 0, this.body.position.z)
        .distanceTo(new THREE.Vector3(ballPos.x, 0, ballPos.z));
      this.hasBall = dist < BALL_POSSESSION_DIST;
    }
  }

  move(dir, sprint = false) {
    const speed = PLAYER_SPEED * (this.legend ? this.legend.speed / 90 : 1) * (sprint ? SPRINT_MULTIPLIER : 1);
    if (this.isSpecialActive && this.legend && this.legend.id === 'r9') {
      // R9 unstoppable force - extra speed
    }
    this.body.velocity.x = dir.x * speed;
    this.body.velocity.z = dir.z * speed;

    if (dir.lengthSq() > 0.01) {
      this.facingDir.copy(dir).normalize();
      this.moveDir.copy(dir);
    }
  }

  shoot(targetDir, power = SHOOT_POWER) {
    return {
      direction: targetDir.clone().normalize(),
      power: power * (this.legend ? this.legend.power / 90 : 1),
    };
  }

  pass(targetPos) {
    const dir = new THREE.Vector3()
      .subVectors(targetPos, new THREE.Vector3(this.body.position.x, 0, this.body.position.z))
      .normalize();
    return {
      direction: dir,
      power: PASS_POWER,
    };
  }

  activateSpecial() {
    this.isSpecialActive = true;
    this.specialTimer = 3;
  }

  deactivateSpecial() {
    this.isSpecialActive = false;
    this.specialTimer = 0;
    // Reset mass if R9
    if (this.legend && this.legend.id === 'r9') {
      this.body.mass = this.originalMass;
      this.body.updateMassProperties();
    }
  }

  getPosition() {
    return new THREE.Vector3(this.body.position.x, 0, this.body.position.z);
  }

  getForwardDir() {
    return this.team === TEAM_HOME ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
  }

  getGoalDir() {
    const goalZ = this.team === TEAM_HOME ? COURT_LENGTH / 2 : -COURT_LENGTH / 2;
    return new THREE.Vector3(0, 0, goalZ).sub(this.getPosition()).normalize();
  }
}
