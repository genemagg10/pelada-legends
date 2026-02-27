import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PhysicsWorld } from './systems/PhysicsWorld.js';
import { CourtBuilder } from './systems/CourtBuilder.js';
import { CameraController } from './systems/CameraController.js';
import { InputManager } from './systems/InputManager.js';
import { AIController } from './systems/AIController.js';
import { SpecialMoveManager } from './systems/SpecialMoveManager.js';
import { Ball } from './entities/Ball.js';
import { Player } from './entities/Player.js';
import { UIManager } from './ui/UIManager.js';
import { GhostTrailEffect } from './shaders/ghostTrail.js';
import { DustParticleSystem } from './shaders/dustParticle.js';
import {
  LEGENDS, TEAM_HOME, TEAM_AWAY, COURT_LENGTH, COURT_WIDTH,
  MAX_GINGA, GINGA_CHARGE_RATE, GINGA_CHARGE_ON_DRIBBLE, GINGA_COST,
  MATCH_DURATION, SHOOT_POWER, PASS_POWER,
} from './constants.js';

// ── Game globals (populated during init) ──
let renderer, scene, camera, composer;
let physics, cameraController, inputManager, aiController;
let ghostTrail, dustSystem, ballEntity, specialMoveManager;
let engineReady = false;

// ── Game State ──
let gameState = 'menu';
let scoreHome = 0;
let scoreAway = 0;
let matchTime = MATCH_DURATION;
let ginga = 0;
let humanPlayer = null;
let allPlayers = [];
let goalCooldown = 0;
let dustTimer = 0;

// ══════════════════════════════════════════════════════
// 1. Initialize UI FIRST (pure DOM, always succeeds)
// ══════════════════════════════════════════════════════
const uiManager = new UIManager();

uiManager.onStartGame = (selectedLegend) => {
  if (!engineReady) {
    // Try to init engine now if it wasn't ready
    try {
      initEngine();
    } catch (e) {
      console.error('Failed to initialize 3D engine:', e);
      uiManager.showMessage('WebGL Error!', 5000);
      return;
    }
  }
  startMatch(selectedLegend);
};

// ══════════════════════════════════════════════════════
// 2. Initialize 3D engine (may fail without WebGL)
// ══════════════════════════════════════════════════════
function initEngine() {
  if (engineReady) return;

  const canvas = document.getElementById('game-canvas');

  // ── Renderer ──
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Scene ──
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0a00);
  scene.fog = new THREE.FogExp2(0x332211, 0.008);

  // ── Camera ──
  camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 300
  );

  // ── Lighting: Golden Hour ──
  scene.add(new THREE.AmbientLight(0xffddaa, 0.3));
  scene.add(new THREE.HemisphereLight(0xffaa44, 0x443322, 0.5));

  const sunLight = new THREE.DirectionalLight(0xff8833, 2.0);
  sunLight.position.set(-40, 15, -20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 120;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xffcc88, 0.4);
  fillLight.position.set(20, 10, 30);
  scene.add(fillLight);

  // ── Post-Processing ──
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4, 0.6, 0.85
  ));
  composer.addPass(new OutputPass());

  // ── Physics & Court ──
  physics = new PhysicsWorld();
  const courtBuilder = new CourtBuilder(scene);
  courtBuilder.build();

  // ── Systems ──
  cameraController = new CameraController(camera);
  inputManager = new InputManager();
  aiController = new AIController();
  ghostTrail = new GhostTrailEffect(scene);
  dustSystem = new DustParticleSystem(scene);
  ballEntity = new Ball(scene, physics.ballBody);
  specialMoveManager = new SpecialMoveManager(physics, ghostTrail);

  engineReady = true;

  // ── Resize ──
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });
}

// Try to init immediately (but don't die if it fails)
try {
  initEngine();
} catch (e) {
  console.error('Deferred engine init – will retry on game start:', e);
}

// ══════════════════════════════════════════════════════
// 3. Match lifecycle
// ══════════════════════════════════════════════════════
function startMatch(selectedLegend) {
  // Clear existing players
  for (const p of allPlayers) {
    scene.remove(p.mesh);
  }
  allPlayers = [];

  // Home team (player's team) – attacking toward +Z
  const homePositions = [
    { x: 0, z: -10 },
    { x: -8, z: -5 },
    { x: 8, z: -5 },
  ];

  // Away team – attacking toward -Z
  const awayPositions = [
    { x: 0, z: 10 },
    { x: -8, z: 5 },
    { x: 8, z: 5 },
  ];

  const availableLegends = LEGENDS.filter(l => l.id !== selectedLegend.id);

  // Human player
  const humanBody = physics.createPlayerBody(homePositions[0]);
  humanPlayer = new Player(scene, humanBody, selectedLegend, TEAM_HOME, true);
  allPlayers.push(humanPlayer);

  // Home AI teammates
  for (let i = 1; i < homePositions.length; i++) {
    const legend = availableLegends.splice(
      Math.floor(Math.random() * availableLegends.length), 1
    )[0];
    const body = physics.createPlayerBody(homePositions[i]);
    allPlayers.push(new Player(scene, body, legend, TEAM_HOME, false));
  }

  // Away team
  for (let i = 0; i < awayPositions.length; i++) {
    const legend = availableLegends.splice(
      Math.floor(Math.random() * availableLegends.length), 1
    )[0];
    const body = physics.createPlayerBody(awayPositions[i]);
    allPlayers.push(new Player(scene, body, legend, TEAM_AWAY, false));
  }

  // Reset game state
  scoreHome = 0;
  scoreAway = 0;
  matchTime = MATCH_DURATION;
  ginga = 0;
  goalCooldown = 0;
  gameState = 'playing';
  physics.resetBall();

  uiManager.updateScore(0, 0);
  uiManager.updateGinga(0);
  uiManager.showMessage('KICK OFF!', 2000);
}

// ══════════════════════════════════════════════════════
// 4. Goal detection
// ══════════════════════════════════════════════════════
function checkGoals() {
  if (goalCooldown > 0) return;

  const ballPos = physics.ballBody.position;
  const goalHW = 4;
  const hl = COURT_LENGTH / 2;

  if (ballPos.z > hl + 1 && Math.abs(ballPos.x) < goalHW && ballPos.y < 3.5) {
    onGoal(TEAM_HOME);
    return;
  }
  if (ballPos.z < -hl - 1 && Math.abs(ballPos.x) < goalHW && ballPos.y < 3.5) {
    onGoal(TEAM_AWAY);
  }
}

function onGoal(scoringTeam) {
  goalCooldown = 3;
  gameState = 'goal';

  if (scoringTeam === TEAM_HOME) scoreHome++;
  else scoreAway++;

  uiManager.updateScore(scoreHome, scoreAway);
  uiManager.showGoal();

  setTimeout(() => {
    physics.resetBall();
    resetPlayerPositions();
    gameState = 'playing';
    uiManager.showMessage('KICK OFF!', 1500);
  }, 2500);
}

function resetPlayerPositions() {
  const homeZ = [-10, -5, -5];
  const homeX = [0, -8, 8];
  const awayZ = [10, 5, 5];
  const awayX = [0, -8, 8];

  let hi = 0, ai = 0;
  for (const p of allPlayers) {
    if (p.team === TEAM_HOME) {
      p.body.position.set(homeX[hi], 0.9, homeZ[hi]);
      p.body.velocity.set(0, 0, 0);
      hi++;
    } else {
      p.body.position.set(awayX[ai], 0.9, awayZ[ai]);
      p.body.velocity.set(0, 0, 0);
      ai++;
    }
  }
}

// ══════════════════════════════════════════════════════
// 5. Input processing
// ══════════════════════════════════════════════════════
function processInput(dt) {
  if (!humanPlayer || gameState !== 'playing') return;

  const moveDir = inputManager.getMoveDirection();
  const isMoving = inputManager.isMoving();
  humanPlayer.move(moveDir, isMoving);

  // Dust when moving
  if (isMoving && moveDir.lengthSq() > 0.1) {
    dustTimer += dt;
    if (dustTimer > 0.1) {
      dustTimer = 0;
      dustSystem.emit(humanPlayer.body.position.x, 0, humanPlayer.body.position.z, 3);
    }
  }

  // Shoot
  if (inputManager.isShootPressed() && humanPlayer.hasBall) {
    const shootDir = humanPlayer.getGoalDir();
    const shootData = humanPlayer.shoot(shootDir, SHOOT_POWER);

    let powerMult = 1;
    for (const fx of specialMoveManager.activeEffects) {
      if (fx.type === 'shotBoost' && fx.player === humanPlayer) {
        powerMult = fx.multiplier;
        break;
      }
    }

    physics.ballBody.velocity.set(
      shootData.direction.x * shootData.power * powerMult,
      3 + Math.random() * 2,
      shootData.direction.z * shootData.power * powerMult
    );

    ginga = Math.min(MAX_GINGA, ginga + 5);
    dustSystem.emit(physics.ballBody.position.x, 0, physics.ballBody.position.z, 8);
  }

  // Pass
  if (inputManager.isPassPressed() && humanPlayer.hasBall) {
    const teammates = allPlayers.filter(p => p.team === TEAM_HOME && p !== humanPlayer);
    if (teammates.length > 0) {
      let best = teammates[0];
      let bestScore = -Infinity;
      for (const mate of teammates) {
        const dir = mate.getPosition().clone().sub(humanPlayer.getPosition());
        const dot = dir.normalize().dot(humanPlayer.facingDir);
        const dist = humanPlayer.getPosition().distanceTo(mate.getPosition());
        const score = dot * 10 - dist;
        if (score > bestScore) {
          bestScore = score;
          best = mate;
        }
      }

      const passData = humanPlayer.pass(best.getPosition());
      physics.ballBody.velocity.set(
        passData.direction.x * passData.power,
        1,
        passData.direction.z * passData.power
      );
      ginga = Math.min(MAX_GINGA, ginga + 10);
    }
  }

  // Special move
  if (inputManager.isSpecialPressed() && ginga >= GINGA_COST) {
    if (specialMoveManager.activate(humanPlayer, ballEntity, ginga)) {
      ginga = 0;
    }
  }

  inputManager.clearJustPressed();
}

// ══════════════════════════════════════════════════════
// 6. Ginga & timer
// ══════════════════════════════════════════════════════
function updateGinga(dt) {
  if (gameState !== 'playing') return;

  ginga = Math.min(MAX_GINGA, ginga + GINGA_CHARGE_RATE * dt);
  if (humanPlayer && humanPlayer.hasBall) {
    ginga = Math.min(MAX_GINGA, ginga + GINGA_CHARGE_ON_DRIBBLE * dt * 0.5);
  }
  uiManager.updateGinga(ginga);
}

function updateMatchTimer(dt) {
  if (gameState !== 'playing') return;

  matchTime -= dt;
  uiManager.updateTimer(Math.max(0, matchTime));

  if (matchTime <= 0) {
    gameState = 'ended';
    const result = scoreHome > scoreAway ? 'YOU WIN!'
      : scoreHome < scoreAway ? 'YOU LOSE!'
      : 'DRAW!';
    uiManager.showMessage(result, 5000);

    setTimeout(() => {
      document.getElementById('select-screen').classList.remove('hidden');
      document.getElementById('hud').classList.remove('visible');
      gameState = 'menu';
    }, 5000);
  }
}

// ══════════════════════════════════════════════════════
// 7. Main game loop
// ══════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  if (!engineReady) return;

  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing') {
    processInput(dt);
    physics.update(dt);

    const ballPos = ballEntity.getPosition();
    for (const player of allPlayers) {
      player.update(dt, ballPos);
    }

    const aiPlayers = allPlayers.filter(p => !p.isHuman);
    aiController.update(
      dt, aiPlayers, humanPlayer, physics.ballBody,
      allPlayers, allPlayers, { home: scoreHome, away: scoreAway }
    );

    specialMoveManager.update(dt, allPlayers);

    goalCooldown = Math.max(0, goalCooldown - dt);
    checkGoals();
    updateGinga(dt);
    updateMatchTimer(dt);

    cameraController.update(dt, ballPos, humanPlayer ? humanPlayer.getPosition() : null);
  } else if (gameState === 'goal') {
    physics.update(dt);
    const ballPos = ballEntity.getPosition();
    cameraController.update(dt, ballPos, humanPlayer ? humanPlayer.getPosition() : null);
    goalCooldown = Math.max(0, goalCooldown - dt);
  }

  // Always update visuals
  ballEntity.update();
  ghostTrail.update(dt);
  dustSystem.update(dt);

  composer.render();
}

animate();
