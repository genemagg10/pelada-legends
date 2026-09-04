import * as THREE from 'three';
import {
  COURT_WIDTH, COURT_LENGTH, WALL_HEIGHT, WALL_THICKNESS,
  GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH,
  TEAM_HOME_COLOR, TEAM_AWAY_COLOR,
} from '../constants.js';
import { setShadow } from '../utils/shadows.js';
import {
  createConcreteTexture,
  createBrickTexture,
  createGraffitiTexture,
} from '../utils/textures.js';

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class CourtBuilder {
  constructor(scene) {
    this.scene = scene;
    this.meshes = [];
    this.rng = mulberry32(1337);
  }

  build() {
    this._createCourt();
    this._createWalls();
    this._createGoals();
    this._createBuildings();
    this._createSpectators();
    this._createStreetLamps();
    this._createCourtMarkings();
    this._createEndBanners();
    this._createSky();
  }

  _rand() {
    return this.rng();
  }

  _createCourt() {
    const concrete = createConcreteTexture();
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_WIDTH + 2, COURT_LENGTH + 2),
      new THREE.MeshStandardMaterial({
        color: 0xc8b59a,
        map: concrete,
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    court.rotation.x = -Math.PI / 2;
    setShadow(court, false, true);
    this.scene.add(court);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({
        color: 0x3a2a22,
        roughness: 1,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    setShadow(ground, false, true);
    this.scene.add(ground);

    const goldTint = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_WIDTH - 2, 7),
      new THREE.MeshBasicMaterial({ color: TEAM_HOME_COLOR, transparent: true, opacity: 0.08 })
    );
    goldTint.rotation.x = -Math.PI / 2;
    goldTint.position.set(0, 0.012, COURT_LENGTH / 2 - 5);
    this.scene.add(goldTint);

    const redTint = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_WIDTH - 2, 7),
      new THREE.MeshBasicMaterial({ color: TEAM_AWAY_COLOR, transparent: true, opacity: 0.08 })
    );
    redTint.rotation.x = -Math.PI / 2;
    redTint.position.set(0, 0.012, -COURT_LENGTH / 2 + 5);
    this.scene.add(redTint);
  }

  _createCourtMarkings() {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xfff4d0,
      transparent: true,
      opacity: 0.78,
    });

    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(COURT_WIDTH - 1, 0.18), lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.015;
    this.scene.add(centerLine);

    const circle = new THREE.Mesh(new THREE.RingGeometry(4.7, 5.05, 48), lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.015;
    this.scene.add(circle);

    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), lineMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = 0.016;
    this.scene.add(spot);

    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    for (const x of [-hw + 0.5, hw - 0.5]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.16, COURT_LENGTH - 1), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.015, 0);
      this.scene.add(line);
    }

    for (const z of [-hl + 0.5, hl - 0.5]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(COURT_WIDTH - 1, 0.16), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.015, z);
      this.scene.add(line);
    }

    const penW = 14;
    const penD = 8;
    for (const zSign of [-1, 1]) {
      const penZ = zSign * (hl - penD / 2);
      const penOutline = new THREE.Group();

      const front = new THREE.Mesh(new THREE.PlaneGeometry(penW, 0.14), lineMat);
      front.position.set(0, 0, -zSign * penD / 2);
      penOutline.add(front);

      for (const xSign of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(0.14, penD), lineMat);
        side.position.set(xSign * penW / 2, 0, 0);
        penOutline.add(side);
      }

      penOutline.rotation.x = -Math.PI / 2;
      penOutline.position.set(0, 0.015, penZ);
      this.scene.add(penOutline);
    }
  }

  _createWalls() {
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const hh = WALL_HEIGHT / 2;
    const goalHW = GOAL_WIDTH / 2;
    const brickMap = createBrickTexture();

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0xbb6655,
      map: brickMap,
      roughness: 0.88,
      metalness: 0.02,
    });

    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x9aa0a8,
      roughness: 0.4,
      metalness: 0.65,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });

    this._addWallMesh(-hw - WALL_THICKNESS / 2, hh, 0, WALL_THICKNESS, WALL_HEIGHT, COURT_LENGTH, brickMat);
    this._addWallMesh(hw + WALL_THICKNESS / 2, hh, 0, WALL_THICKNESS, WALL_HEIGHT, COURT_LENGTH, brickMat);

    const sideSegW = (COURT_WIDTH - GOAL_WIDTH) / 2;
    this._addWallMesh(-hw / 2 - goalHW / 2, hh, -hl - WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);
    this._addWallMesh(hw / 2 + goalHW / 2, hh, -hl - WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);
    this._addWallMesh(-hw / 2 - goalHW / 2, hh, hl + WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);
    this._addWallMesh(hw / 2 + goalHW / 2, hh, hl + WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);

    this._addWallMesh(0, GOAL_HEIGHT + 0.25, -hl - WALL_THICKNESS / 2, GOAL_WIDTH, 0.5, WALL_THICKNESS, brickMat);
    this._addWallMesh(0, GOAL_HEIGHT + 0.25, hl + WALL_THICKNESS / 2, GOAL_WIDTH, 0.5, WALL_THICKNESS, brickMat);

    this._addGraffiti(-hw - WALL_THICKNESS - 0.02, hh, -10, 11, WALL_HEIGHT - 0.4, 'PELADA', '#ffcc00');
    this._addGraffiti(-hw - WALL_THICKNESS - 0.02, hh, 8, 10, WALL_HEIGHT - 0.4, 'GINGA', '#39e07a');
    this._addGraffiti(hw + WALL_THICKNESS + 0.02, hh, -6, 12, WALL_HEIGHT - 0.4, 'RUA', '#ff4455');
    this._addGraffiti(hw + WALL_THICKNESS + 0.02, hh, 11, 9, WALL_HEIGHT - 0.4, 'GOOL', '#4c9fff');
  }

  _addWallMesh(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    setShadow(mesh, true, true);
    this.scene.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  _addGraffiti(x, y, z, w, h, label, accentHex) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: createGraffitiTexture(label, accentHex),
        transparent: true,
        roughness: 0.7,
        metalness: 0,
        emissive: new THREE.Color(accentHex),
        emissiveIntensity: 0.12,
      })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
  }

  _createGoals() {
    const hw = GOAL_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.75,
    });

    for (const zSign of [-1, 1]) {
      const attackingHome = zSign === 1;
      const accent = attackingHome ? TEAM_HOME_COLOR : TEAM_AWAY_COLOR;
      const netMat = new THREE.MeshStandardMaterial({
        color: accent,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
        side: THREE.DoubleSide,
      });

      const goalGroup = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.07, 0.07, GOAL_HEIGHT, 8);

      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-hw, GOAL_HEIGHT / 2, 0);
      goalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(hw, GOAL_HEIGHT / 2, 0);
      goalGroup.add(rightPost);

      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, GOAL_WIDTH, 8), postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, GOAL_HEIGHT, 0);
      goalGroup.add(crossbar);

      const netBack = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, 8, 6), netMat);
      netBack.position.set(0, GOAL_HEIGHT / 2, zSign * GOAL_DEPTH);
      goalGroup.add(netBack);

      for (const xSign of [-1, 1]) {
        const netSide = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 4, 6), netMat);
        netSide.rotation.y = Math.PI / 2;
        netSide.position.set(xSign * hw, GOAL_HEIGHT / 2, zSign * GOAL_DEPTH / 2);
        goalGroup.add(netSide);
      }

      const netTop = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH, 8, 4), netMat);
      netTop.rotation.x = Math.PI / 2;
      netTop.position.set(0, GOAL_HEIGHT, zSign * GOAL_DEPTH / 2);
      goalGroup.add(netTop);

      goalGroup.position.z = zSign * hl;
      goalGroup.traverse((child) => {
        if (child.isMesh) setShadow(child, true, false);
      });
      this.scene.add(goalGroup);
    }
  }

  _createEndBanners() {
    const hl = COURT_LENGTH / 2;
    const makeBanner = (text, color, z) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#120800';
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = '700 34px "Permanent Marker", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 34);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6.5, 1.4),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      mesh.position.set(-COURT_WIDTH / 2 - 0.6, 2.3, z);
      mesh.rotation.y = Math.PI / 2;
      this.scene.add(mesh);
    };

    makeBanner('YOU SCORE →', '#ffcc00', hl - 8);
    makeBanner('← RIVAL', '#ff6670', -hl + 8);
  }

  _createBuildings() {
    const buildingColors = [0x3a2a28, 0x4a3328, 0x2d2430, 0x403028, 0x2a2220, 0x382820];
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMats = buildingColors.map((c) => new THREE.MeshStandardMaterial({
      color: c, roughness: 0.92, metalness: 0.04,
    }));

    const positions = [];
    for (let i = 0; i < 48; i++) {
      const side = Math.floor(this._rand() * 4);
      const offset = 7 + this._rand() * 22;
      let x;
      let z;
      switch (side) {
        case 0: x = -hw - offset; z = (this._rand() - 0.5) * COURT_LENGTH * 1.5; break;
        case 1: x = hw + offset; z = (this._rand() - 0.5) * COURT_LENGTH * 1.5; break;
        case 2: x = (this._rand() - 0.5) * COURT_WIDTH * 2; z = -hl - offset; break;
        default: x = (this._rand() - 0.5) * COURT_WIDTH * 2; z = hl + offset; break;
      }
      positions.push({
        x, z,
        w: 4 + this._rand() * 6,
        h: 7 + this._rand() * 16,
        d: 4 + this._rand() * 6,
        colorIdx: Math.floor(this._rand() * buildingColors.length),
      });
    }

    for (const b of positions) {
      const mesh = new THREE.Mesh(buildingGeo, buildingMats[b.colorIdx]);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.position.set(b.x, b.h / 2, b.z);
      setShadow(mesh, true, true);
      this.scene.add(mesh);
      this._addWindows(b);

      if (this._rand() > 0.55) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.6, metalness: 0.3 })
        );
        tank.position.set(b.x + (this._rand() - 0.5) * b.w * 0.3, b.h + 0.4, b.z);
        this.scene.add(tank);
      }
    }
  }

  _addWindows(b) {
    const floors = Math.floor(b.h / 3.5);
    const cols = Math.max(1, Math.floor(b.w / 2.5));

    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        if (this._rand() > 0.62) continue;
        const lit = this._rand() > 0.38;
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.75, 0.95),
          new THREE.MeshStandardMaterial({
            color: lit ? 0xffe0a8 : 0x22180e,
            emissive: lit ? 0xffc878 : 0x000000,
            emissiveIntensity: lit ? 0.55 : 0,
            roughness: 0.35,
          })
        );

        const xOffset = (c - (cols - 1) / 2) * 2.2;
        const yPos = f * 3.5 + 2;
        if (Math.abs(b.x) > Math.abs(b.z)) {
          win.position.set(b.x + (b.x > 0 ? -b.w / 2 - 0.01 : b.w / 2 + 0.01), yPos, b.z + xOffset);
          win.rotation.y = b.x > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          win.position.set(b.x + xOffset, yPos, b.z + (b.z > 0 ? -b.d / 2 - 0.01 : b.d / 2 + 0.01));
          win.rotation.y = b.z > 0 ? Math.PI : 0;
        }
        this.scene.add(win);
      }
    }
  }

  _createSpectators() {
    const colors = [0xff4444, 0x44ff44, 0xffff44, 0xff8844, 0x4488ff, 0xff44ff];
    const specGeo = new THREE.PlaneGeometry(0.55, 1.1);
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    for (let i = 0; i < 24; i++) {
      const spec = new THREE.Mesh(
        specGeo,
        new THREE.MeshBasicMaterial({
          color: colors[Math.floor(this._rand() * colors.length)],
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        })
      );
      const side = Math.floor(this._rand() * 4);
      const offset = 8 + this._rand() * 18;
      if (side === 0) spec.position.set(-hw - offset, 4 + this._rand() * 10, (this._rand() - 0.5) * COURT_LENGTH);
      else if (side === 1) spec.position.set(hw + offset, 4 + this._rand() * 10, (this._rand() - 0.5) * COURT_LENGTH);
      else if (side === 2) spec.position.set((this._rand() - 0.5) * COURT_WIDTH, 4 + this._rand() * 10, -hl - offset);
      else spec.position.set((this._rand() - 0.5) * COURT_WIDTH, 4 + this._rand() * 10, hl + offset);
      this.scene.add(spec);
    }
  }

  _createStreetLamps() {
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const lampPositions = [
      [-hw - 3, -hl / 2],
      [-hw - 3, 0],
      [-hw - 3, hl / 2],
      [hw + 3, -hl / 2],
      [hw + 3, 0],
      [hw + 3, hl / 2],
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0xffe0aa,
      emissive: 0xffc878,
      emissiveIntensity: 0.95,
    });

    for (const [x, z] of lampPositions) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6, 6), poleMat);
      pole.position.set(x, 3, z);
      setShadow(pole, true, false);
      this.scene.add(pole);

      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), housingMat);
      housing.position.set(x, 6.1, z);
      this.scene.add(housing);

      const light = new THREE.PointLight(0xffc878, 1.15, 34, 1.6);
      light.position.set(x, 6, z);
      this.scene.add(light);
    }
  }

  _createSky() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 120;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = this._rand() * Math.PI * 2;
      const phi = 0.15 + this._rand() * 1.1;
      const r = 90 + this._rand() * 40;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.abs(Math.cos(phi) * r) + 18;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xfff4cc, size: 0.55, sizeAttenuation: true })
    ));

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xdde6ff })
    );
    moon.position.set(-50, 42, -28);
    this.scene.add(moon);
  }
}
