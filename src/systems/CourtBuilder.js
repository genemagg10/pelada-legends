import * as THREE from 'three';
import {
  COURT_WIDTH, COURT_LENGTH, WALL_HEIGHT, WALL_THICKNESS,
  GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH,
} from '../constants.js';

export class CourtBuilder {
  constructor(scene) {
    this.scene = scene;
    this.meshes = [];
  }

  build() {
    this._createCourt();
    this._createWalls();
    this._createGoals();
    this._createBuildings();
    this._createSpectators();
    this._createStreetLamps();
    this._createCourtMarkings();
  }

  _createCourt() {
    // Concrete court
    const courtGeo = new THREE.PlaneGeometry(COURT_WIDTH + 2, COURT_LENGTH + 2);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x999988,
      roughness: 0.95,
      metalness: 0.0,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    this.scene.add(court);

    // Extended ground for surrounding area
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x665544,
      roughness: 1.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _createCourtMarkings() {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xccccbb,
      transparent: true,
      opacity: 0.3,
    });

    // Center line
    const centerLine = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_WIDTH - 1, 0.15),
      lineMat
    );
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.01;
    this.scene.add(centerLine);

    // Center circle
    const circleGeo = new THREE.RingGeometry(4.8, 5, 48);
    const circle = new THREE.Mesh(circleGeo, lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.01;
    this.scene.add(circle);

    // Boundary lines
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    // Side lines
    for (const x of [-hw + 0.5, hw - 0.5]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, COURT_LENGTH - 1), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.01, 0);
      this.scene.add(line);
    }

    // End lines
    for (const z of [-hl + 0.5, hl - 0.5]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(COURT_WIDTH - 1, 0.12), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, z);
      this.scene.add(line);
    }

    // Penalty areas
    const penW = 14;
    const penD = 8;
    for (const zSign of [-1, 1]) {
      const penZ = zSign * (hl - penD / 2);
      const penOutline = new THREE.Group();

      // Front line
      const front = new THREE.Mesh(new THREE.PlaneGeometry(penW, 0.1), lineMat);
      front.position.set(0, 0, -zSign * penD / 2);
      penOutline.add(front);

      // Side lines
      for (const xSign of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(0.1, penD), lineMat);
        side.position.set(xSign * penW / 2, 0, 0);
        penOutline.add(side);
      }

      penOutline.rotation.x = -Math.PI / 2;
      penOutline.position.set(0, 0.01, penZ);
      this.scene.add(penOutline);
    }
  }

  _createWalls() {
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const hh = WALL_HEIGHT / 2;
    const goalHW = GOAL_WIDTH / 2;

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x994433,
      roughness: 0.9,
      metalness: 0.0,
    });

    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });

    // Side walls (brick)
    this._addWallMesh(-hw - WALL_THICKNESS / 2, hh, 0, WALL_THICKNESS, WALL_HEIGHT, COURT_LENGTH, brickMat);
    this._addWallMesh(hw + WALL_THICKNESS / 2, hh, 0, WALL_THICKNESS, WALL_HEIGHT, COURT_LENGTH, brickMat);

    // End walls with goal gaps (fence style)
    const sideSegW = (COURT_WIDTH - GOAL_WIDTH) / 2;

    // Near end (Z = -hl)
    this._addWallMesh(-hw / 2 - goalHW / 2, hh, -hl - WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);
    this._addWallMesh(hw / 2 + goalHW / 2, hh, -hl - WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);

    // Far end (Z = +hl)
    this._addWallMesh(-hw / 2 - goalHW / 2, hh, hl + WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);
    this._addWallMesh(hw / 2 + goalHW / 2, hh, hl + WALL_THICKNESS / 2, sideSegW, WALL_HEIGHT, WALL_THICKNESS, fenceMat);

    // Top bars over goals
    this._addWallMesh(0, GOAL_HEIGHT + 0.25, -hl - WALL_THICKNESS / 2, GOAL_WIDTH, 0.5, WALL_THICKNESS, brickMat);
    this._addWallMesh(0, GOAL_HEIGHT + 0.25, hl + WALL_THICKNESS / 2, GOAL_WIDTH, 0.5, WALL_THICKNESS, brickMat);

    // Colorful murals on side walls
    this._addMural(-hw - WALL_THICKNESS - 0.01, hh, -8, 10, WALL_HEIGHT - 0.5, 0xffcc00, 'side');
    this._addMural(-hw - WALL_THICKNESS - 0.01, hh, 8, 10, WALL_HEIGHT - 0.5, 0x00cc66, 'side');
    this._addMural(hw + WALL_THICKNESS + 0.01, hh, -5, 12, WALL_HEIGHT - 0.5, 0xff4444, 'side');
    this._addMural(hw + WALL_THICKNESS + 0.01, hh, 10, 8, WALL_HEIGHT - 0.5, 0x4488ff, 'side');
  }

  _addWallMesh(x, y, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  _addMural(x, y, z, w, h, color, side) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      emissive: color,
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (side === 'side') {
      mesh.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    this.scene.add(mesh);
  }

  _createGoals() {
    const hw = GOAL_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.8,
    });

    const netMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
      side: THREE.DoubleSide,
    });

    for (const zSign of [-1, 1]) {
      const gz = zSign * hl;
      const goalGroup = new THREE.Group();

      // Posts
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_HEIGHT, 8);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-hw, GOAL_HEIGHT / 2, 0);
      goalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(hw, GOAL_HEIGHT / 2, 0);
      goalGroup.add(rightPost);

      // Crossbar
      const crossGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_WIDTH, 8);
      const crossbar = new THREE.Mesh(crossGeo, postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, GOAL_HEIGHT, 0);
      goalGroup.add(crossbar);

      // Net (back)
      const netBack = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, 8, 6), netMat);
      netBack.position.set(0, GOAL_HEIGHT / 2, -zSign * GOAL_DEPTH);
      goalGroup.add(netBack);

      // Net (sides)
      for (const xSign of [-1, 1]) {
        const netSide = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 4, 6), netMat);
        netSide.rotation.y = Math.PI / 2;
        netSide.position.set(xSign * hw, GOAL_HEIGHT / 2, -zSign * GOAL_DEPTH / 2);
        goalGroup.add(netSide);
      }

      // Net (top)
      const netTop = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_DEPTH, 8, 4), netMat);
      netTop.rotation.x = Math.PI / 2;
      netTop.position.set(0, GOAL_HEIGHT, -zSign * GOAL_DEPTH / 2);
      goalGroup.add(netTop);

      goalGroup.position.z = gz;
      goalGroup.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
      this.scene.add(goalGroup);
    }
  }

  _createBuildings() {
    const buildingColors = [0x884422, 0x996633, 0x775533, 0xaa6644, 0x664422, 0x887755];
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;

    // Use InstancedMesh for performance
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMats = buildingColors.map(c => new THREE.MeshStandardMaterial({
      color: c, roughness: 0.9, metalness: 0.0,
    }));

    const positions = [];

    // Generate building positions around the court
    for (let i = 0; i < 60; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, z;
      const offset = 6 + Math.random() * 25;

      switch (side) {
        case 0: x = -hw - offset; z = (Math.random() - 0.5) * COURT_LENGTH * 1.5; break;
        case 1: x = hw + offset; z = (Math.random() - 0.5) * COURT_LENGTH * 1.5; break;
        case 2: x = (Math.random() - 0.5) * COURT_WIDTH * 2; z = -hl - offset; break;
        case 3: x = (Math.random() - 0.5) * COURT_WIDTH * 2; z = hl + offset; break;
      }

      const w = 4 + Math.random() * 6;
      const h = 6 + Math.random() * 14;
      const d = 4 + Math.random() * 6;
      const colorIdx = Math.floor(Math.random() * buildingColors.length);

      positions.push({ x, z, w, h, d, colorIdx });
    }

    for (const b of positions) {
      const mesh = new THREE.Mesh(buildingGeo, buildingMats[b.colorIdx]);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Windows (emissive planes)
      this._addWindows(mesh, b.w, b.h, b.d, b.x, b.z);
    }

    // Balcony-style overhangs on closest buildings
    for (let i = 0; i < 10; i++) {
      const b = positions[i];
      if (!b) break;
      const balconyGeo = new THREE.BoxGeometry(b.w * 0.8, 0.2, 1.5);
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.8 });
      const floors = Math.floor(b.h / 3.5);
      for (let f = 1; f <= floors; f++) {
        const balcony = new THREE.Mesh(balconyGeo, balconyMat);
        const bx = b.x;
        const bz = b.z + (b.z > 0 ? -b.d / 2 - 0.7 : b.d / 2 + 0.7);
        balcony.position.set(bx, f * 3.5, bz);
        balcony.castShadow = true;
        this.scene.add(balcony);
      }
    }
  }

  _addWindows(building, w, h, d, bx, bz) {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffddaa,
      emissive: 0xffcc77,
      emissiveIntensity: Math.random() > 0.4 ? 0.6 : 0,
      roughness: 0.3,
    });

    const floors = Math.floor(h / 3.5);
    const cols = Math.max(1, Math.floor(w / 2.5));

    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.7) continue;
        const winGeo = new THREE.PlaneGeometry(0.8, 1.0);
        const win = new THREE.Mesh(winGeo, windowMat.clone());

        const xOffset = (c - (cols - 1) / 2) * 2.2;
        const yPos = f * 3.5 + 2;

        // Place on the face closest to the court
        const closestFace = Math.abs(bx) > Math.abs(bz) ? 'x' : 'z';
        if (closestFace === 'x') {
          win.position.set(bx + (bx > 0 ? -w / 2 - 0.01 : w / 2 + 0.01), yPos, bz + xOffset);
          win.rotation.y = bx > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          win.position.set(bx + xOffset, yPos, bz + (bz > 0 ? -d / 2 - 0.01 : d / 2 + 0.01));
          win.rotation.y = bz > 0 ? Math.PI : 0;
        }

        this.scene.add(win);
      }
    }
  }

  _createSpectators() {
    // Simple sprite "spectators" in windows and on rooftops
    const colors = [0xff4444, 0x44ff44, 0xffff44, 0xff8844, 0x4488ff, 0xff44ff];
    const specGeo = new THREE.PlaneGeometry(0.6, 1.2);

    for (let i = 0; i < 30; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const spec = new THREE.Mesh(specGeo, mat);

      const hw = COURT_WIDTH / 2;
      const hl = COURT_LENGTH / 2;
      const side = Math.floor(Math.random() * 4);
      const offset = 8 + Math.random() * 20;

      switch (side) {
        case 0: spec.position.set(-hw - offset, 4 + Math.random() * 12, (Math.random() - 0.5) * COURT_LENGTH); break;
        case 1: spec.position.set(hw + offset, 4 + Math.random() * 12, (Math.random() - 0.5) * COURT_LENGTH); break;
        case 2: spec.position.set((Math.random() - 0.5) * COURT_WIDTH, 4 + Math.random() * 12, -hl - offset); break;
        case 3: spec.position.set((Math.random() - 0.5) * COURT_WIDTH, 4 + Math.random() * 12, hl + offset); break;
      }

      this.scene.add(spec);
    }
  }

  _createStreetLamps() {
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const lampPositions = [
      [-hw - 3, 0, -hl / 2],
      [-hw - 3, 0, hl / 2],
      [hw + 3, 0, -hl / 2],
      [hw + 3, 0, hl / 2],
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });

    for (const [x, , z] of lampPositions) {
      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6, 6);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 3, z);
      pole.castShadow = true;
      this.scene.add(pole);

      // Light housing
      const housingGeo = new THREE.BoxGeometry(0.6, 0.2, 0.6);
      const housingMat = new THREE.MeshStandardMaterial({
        color: 0xffddaa,
        emissive: 0xffcc88,
        emissiveIntensity: 0.8,
      });
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(x, 6.1, z);
      this.scene.add(housing);

      // Point light
      const light = new THREE.PointLight(0xffcc77, 0.8, 30, 1.5);
      light.position.set(x, 6, z);
      light.castShadow = false; // performance
      this.scene.add(light);
    }
  }
}
