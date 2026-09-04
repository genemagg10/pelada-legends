import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import './style.css';
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
import { setShadow } from './utils/shadows.js';
import {
  LEGENDS, TEAM_HOME, TEAM_AWAY, COURT_LENGTH,
  MAX_GINGA, GINGA_CHARGE_RATE, GINGA_CHARGE_ON_DRIBBLE, GINGA_COST,
  MATCH_DURATION, SHOOT_POWER, BALL_POSSESSION_DIST,
} from './constants.js';

let renderer, scene, camera, composer;
let physics, cameraController, inputManager, aiController;
let ghostTrail, dustSystem, sparkSystem, ballEntity, specialMoveManager;
let engineReady = false;

let gameState = 'menu';
let scoreHome = 0;
let scoreAway = 0;
let matchTime = MATCH_DURATION;
let ginga = 0;
let humanPlayer = null;
let allPlayers = [];
let goalCooldown = 0;
let dustTimer = 0;

const uiManager = new UIManager();

uiManager.onStartGame = (selectedLegend) => {
  if (!engineReady) {
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

function initEngine() {
  if (engineReady) return;

  const canvas = document.getElementById('game-canvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1220);
  scene.fog = new THREE.FogExp2(0x10182a, 0.011);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

  scene.add(new THREE.AmbientLight(0x334466, 0.32));
  scene.add(new THREE.HemisphereLight(0x4a68a0, 0x2a160c, 0.42));

  const moonLight = new THREE.DirectionalLight(0x8899cc, 0.28);
  moonLight.position.set(40, 50, -18);
  scene.add(moonLight);

  const lampKey = new THREE.DirectionalLight(0xffb066, 0.62);
  lampKey.position.set(-22, 20, 8);
  setShadow(lampKey, true, false);
  lampKey.shadow.mapSize.set(2048, 2048);
  lampKey.shadow.camera.left = -50;
  lampKey.shadow.camera.right = 50;
  lampKey.shadow.camera.top = 50;
  lampKey.shadow.camera.bottom = -50;
  lampKey.shadow.camera.near = 1;
  lampKey.shadow.camera.far = 120;
  lampKey.shadow.bias = -0.001;
  scene.add(lampKey);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.28, 0.42, 0.86
  ));
  composer.addPass(new OutputPass());

  physics = new PhysicsWorld();
  new CourtBuilder(scene).build();

  cameraController = new CameraController(camera);
  inputManager = new InputManager();
  aiController = new AIController();
  ghostTrail = new GhostTrailEffect(scene);
  dustSystem = new DustParticleSystem(scene, 200, 0xddbb88);
  sparkSystem = new DustParticleSystem(scene, 80, 0xffe088);
  ballEntity = new Ball(scene, physics.ballBody);
  specialMoveManager = new SpecialMoveManager(physics, ghostTrail);

  engineReady = true;

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });
}

try {
  initEngine();
} catch (e) {
  console.error('Deferred engine init – will retry on game start:', e);
}

function startMatch(selectedLegend) {
  for (const p of allPlayers) p.dispose();
  allPlayers = [];
  if (physics) physics.clearPlayerBodies();

  const homePositions = [
    { x: 0, z: -10 },
    { x: -8, z: -5 },
    { x: 8, z: -5 },
  ];
  const awayPositions = [
    { x: 0, z: 10 },
    { x: -8, z: 5 },
    { x: 8, z: 5 },
  ];

  const availableLegends = LEGENDS.filter((l) => l.id !== selectedLegend.id);

  const humanBody = physics.createPlayerBody(homePositions[0]);
  humanPlayer = new Player(scene, humanBody, selectedLegend, TEAM_HOME, true);
  allPlayers.push(humanPlayer);

  for (let i = 1; i < homePositions.length; i++) {
    const legend = availableLegends.splice(Math.floor(Math.random() * availableLegends.length), 1)[0];
    const body = physics.createPlayerBody(homePositions[i]);
    allPlayers.push(new Player(scene, body, legend, TEAM_HOME, false));
  }

  for (let i = 0; i < awayPositions.length; i++) {
    const legend = availableLegends.splice(Math.floor(Math.random() * availableLegends.length), 1)[0];
    const body = physics.createPlayerBody(awayPositions[i]);
    allPlayers.push(new Player(scene, body, legend, TEAM_AWAY, false));
  }

  scoreHome = 0;
  scoreAway = 0;
  matchTime = MATCH_DURATION;
  ginga = 0;
  goalCooldown = 0;
  gameState = 'playing';
  physics.resetBall();
  ballEntity.setTrail(false);

  uiManager.updateScore(0, 0);
  uiManager.updateGinga(0);
  uiManager.updatePossession(null);
  uiManager.showMessage('KICK OFF!', 2000);
}

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

  let hi = 0;
  let ai = 0;
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

function assignPossession(ballPos) {
  let best = null;
  let bestDist = BALL_POSSESSION_DIST;
  for (const player of allPlayers) {
    player.hasBall = false;
    if (player.distanceToBall < bestDist) {
      bestDist = player.distanceToBall;
      best = player;
    }
  }
  if (best) best.hasBall = true;
  uiManager.updatePossession(best);
}

function cameraRelativeMove(raw) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, 1);
  else forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3().addScaledVector(right, raw.x).addScaledVector(forward, raw.z);
  if (move.lengthSq() > 0) move.normalize();
  return move;
}

function processInput(dt) {
  if (!humanPlayer || gameState !== 'playing') return;

  const raw = inputManager.getMoveDirection();
  const isMoving = inputManager.isMoving();
  const moveDir = cameraRelativeMove(raw);
  humanPlayer.move(moveDir, isMoving);

  if (isMoving && moveDir.lengthSq() > 0.1) {
    dustTimer += dt;
    if (dustTimer > 0.1) {
      dustTimer = 0;
      dustSystem.emit(humanPlayer.body.position.x, 0, humanPlayer.body.position.z, 3);
    }
  }

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

    const power = shootData.power * powerMult;
    physics.ballBody.velocity.set(
      shootData.direction.x * power,
      4.2 + Math.random() * 1.8,
      shootData.direction.z * power
    );
    physics.ballBody.angularVelocity.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 18
    );

    ginga = Math.min(MAX_GINGA, ginga + 5);
    const bx = physics.ballBody.position.x;
    const bz = physics.ballBody.position.z;
    dustSystem.emitBurst(bx, 0, bz, 14);
    sparkSystem.emitBurst(bx, 0.2, bz, 18);
    ballEntity.setTrail(true, 0xffcc66, 0.45);
    cameraController.punch(1.25);
    uiManager.flashShoot();
    humanPlayer.hasBall = false;
  }

  if (inputManager.isPassPressed() && humanPlayer.hasBall) {
    const teammates = allPlayers.filter((p) => p.team === TEAM_HOME && p !== humanPlayer);
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

  if (inputManager.isSpecialPressed() && ginga >= GINGA_COST) {
    if (specialMoveManager.activate(humanPlayer, ballEntity, ginga)) {
      ginga = 0;
    }
  }

  inputManager.clearJustPressed();
}

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
      uiManager.showMenu();
      gameState = 'menu';
    }, 5000);
  }
}

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
    assignPossession(ballPos);

    const aiPlayers = allPlayers.filter((p) => !p.isHuman);
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

  ballEntity.update();
  ghostTrail.update(dt);
  dustSystem.update(dt);
  sparkSystem.update(dt);

  composer.render();
}

animate();
