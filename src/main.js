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
import { TouchControls } from './ui/TouchControls.js';
import { GhostTrailEffect } from './shaders/ghostTrail.js';
import { DustParticleSystem } from './shaders/dustParticle.js';
import { VfxManager } from './systems/VfxManager.js';
import { setShadow } from './utils/shadows.js';
import {
  LEGENDS, TEAM_HOME, TEAM_AWAY, COURT_LENGTH,
  MAX_GINGA, GINGA_CHARGE_RATE, GINGA_CHARGE_ON_DRIBBLE, GINGA_COST,
  MATCH_DURATION, SHOOT_POWER, BALL_POSSESSION_DIST,
  COLOR_NIGHT, COLOR_FOG, COLOR_AMBER, COLOR_FILL,
} from './constants.js';

let renderer, scene, camera, composer;
let physics, cameraController, inputManager, touchControls, aiController;
let ghostTrail, dustSystem, sparkSystem, ballEntity, specialMoveManager, vfx;
let engineReady = false;
let lastCarrier = null;
let hitStop = 0;

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
  // Dieter band 1.15–1.25. Top of the range so phone mids still read at night.
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  // Tokens: gold #ffcc00 · ember #ff6600 · night #1a0a00 · fog #332211.
  // Not cool blue, not FIFA day, not white stadium.
  scene.background = new THREE.Color(COLOR_NIGHT);
  scene.fog = new THREE.FogExp2(COLOR_FOG, 0.0052);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

  scene.add(new THREE.AmbientLight(0x4a2a14, 0.40));
  scene.add(new THREE.HemisphereLight(COLOR_AMBER, 0x3d2210, 0.54));

  // Key: sodium #ffb066, one shadow caster. +36% vs the old 0.72 gold sun.
  const sun = new THREE.DirectionalLight(0xffb066, 0.98);
  sun.position.set(-18, 34, 12);
  setShadow(sun, true, false);
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2.5;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(COLOR_FILL, 0.50);
  fill.position.set(24, 18, -16);
  fill.castShadow = false;
  scene.add(fill);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.26, 0.45, 0.86
  ));
  composer.addPass(new OutputPass());

  physics = new PhysicsWorld();
  new CourtBuilder(scene).build();

  cameraController = new CameraController(camera);
  inputManager = new InputManager();
  touchControls = new TouchControls(inputManager);
  window.__peladaInput = inputManager;
  aiController = new AIController();
  ghostTrail = new GhostTrailEffect(scene);
  dustSystem = new DustParticleSystem(scene, 200, 0xddbb88);
  sparkSystem = new DustParticleSystem(scene, 80, 0xffe088);
  vfx = new VfxManager(scene);
  ballEntity = new Ball(scene, physics.ballBody);
  ballEntity.onImpact = (x, z, speed) => {
    vfx.impactDisc(x, z, 0xfff1c4, THREE.MathUtils.clamp(speed / 18, 0.7, 1.4));
  };
  specialMoveManager = new SpecialMoveManager(physics, ghostTrail);

  engineReady = true;

  const applyViewport = () => {
    const vv = window.visualViewport;
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    const canvas = renderer.domElement;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.top = `${vv?.offsetTop ?? 0}px`;
    canvas.style.left = `${vv?.offsetLeft ?? 0}px`;
  };
  window.addEventListener('resize', applyViewport);
  window.visualViewport?.addEventListener('resize', applyViewport);
  window.visualViewport?.addEventListener('scroll', applyViewport);
  applyViewport();
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
  ballEntity.setPossessionTeam(null);
  lastCarrier = null;
  hitStop = 0;

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
      if (typeof p.body.wakeUp === 'function') p.body.wakeUp();
      hi++;
    } else {
      p.body.position.set(awayX[ai], 0.9, awayZ[ai]);
      p.body.velocity.set(0, 0, 0);
      if (typeof p.body.wakeUp === 'function') p.body.wakeUp();
      ai++;
    }
  }
}

function assignPossession() {
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

  const prevId = lastCarrier ? lastCarrier.legend?.id : null;
  const nextId = best ? best.legend?.id : null;
  if (prevId !== nextId) {
    if (lastCarrier && best && lastCarrier.team !== best.team) {
      uiManager.flashTurnover(best.team === TEAM_HOME);
    }
    lastCarrier = best;
  }

  ballEntity.setPossessionTeam(best ? best.team : null);
  uiManager.updatePossession(best);
  return best;
}

function cameraRelativeMove(raw) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, 1);
  else forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3().addScaledVector(right, raw.x).addScaledVector(forward, raw.z);
  const mag = Math.min(1, raw.length());
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(mag);
  return move;
}

function processInput(dt) {
  if (!humanPlayer || gameState !== 'playing') return;

  const raw = inputManager.getMoveDirection();
  const isMoving = inputManager.isMoving();
  const moveDir = cameraRelativeMove(raw);
  humanPlayer.move(moveDir, isMoving);

  if (isMoving && moveDir.lengthSq() > 0.1) {
    uiManager.fadeControlsHint();
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
    dustSystem.emitBurst(bx, 0, bz, 10);
    sparkSystem.emitBurst(bx, 0.2, bz, 14);
    vfx.impactDisc(bx, bz, 0xffe08a, 1.1);
    ballEntity.kickJuice(power);
    cameraController.punch(power / SHOOT_POWER);
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
      const color = humanPlayer.legend?.color ?? 0xffcc00;
      const p = humanPlayer.body.position;
      vfx.specialBurst(p.x, 0.9, p.z, color);
      sparkSystem.emitBurst(p.x, 0.4, p.z, 16);
      cameraController.punch(1.05);
      uiManager.flashDesat();
      hitStop = 0.05;
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
      touchControls?.reset();
      gameState = 'menu';
    }, 5000);
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  if (!engineReady) return;

  const dt = Math.min(clock.getDelta(), 0.05);

  if (hitStop > 0) {
    hitStop -= dt;
    vfx.update(dt);
    ghostTrail.update(dt);
    composer.render();
    return;
  }

  let carrier = lastCarrier;
  if (gameState === 'playing') {
    processInput(dt);
    physics.update(dt);

    const ballPos = ballEntity.getPosition();
    for (const player of allPlayers) {
      player.update(dt, ballPos);
    }
    carrier = assignPossession();

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

    cameraController.update(
      dt,
      ballPos,
      carrier ? carrier.getPosition() : null,
      humanPlayer ? humanPlayer.getPosition() : null,
      !!carrier
    );
  } else if (gameState === 'goal') {
    physics.update(dt);
    const ballPos = ballEntity.getPosition();
    cameraController.update(
      dt,
      ballPos,
      null,
      humanPlayer ? humanPlayer.getPosition() : null,
      false
    );
    goalCooldown = Math.max(0, goalCooldown - dt);
  }

  ballEntity.update(dt);
  ghostTrail.update(dt);
  dustSystem.update(dt);
  sparkSystem.update(dt);
  vfx.update(dt);

  publishInputDebug();
  composer.render();
}

function publishInputDebug() {
  const raw = inputManager?.touchMove;
  const body = humanPlayer?.body;
  const info = {
    legend: humanPlayer?.legend?.id ?? null,
    touchMove: raw
      ? { x: Number(raw.x.toFixed(3)), z: Number(raw.z.toFixed(3)), len: Number(raw.length().toFixed(3)) }
      : null,
    vel: body
      ? { x: Number(body.velocity.x.toFixed(2)), z: Number(body.velocity.z.toFixed(2)) }
      : null,
    sleepState: body?.sleepState ?? null,
    pos: body
      ? { x: Number(body.position.x.toFixed(2)), z: Number(body.position.z.toFixed(2)) }
      : null,
  };
  window.__peladaDebug = info;

  const el = document.getElementById('input-debug');
  if (!el) return;
  const show = new URLSearchParams(window.location.search).has('debug')
    || window.__peladaShowDebug === true;
  el.hidden = !show;
  if (!show) return;
  const tm = info.touchMove;
  const v = info.vel;
  el.textContent = [
    `${info.legend ?? '—'}  sleep ${info.sleepState}`,
    `tm ${tm ? tm.len.toFixed(2) : '0'}  (${tm ? tm.x.toFixed(2) : 0}, ${tm ? tm.z.toFixed(2) : 0})`,
    `v  ${v ? v.x.toFixed(1) : 0}, ${v ? v.z.toFixed(1) : 0}`,
    `p  ${info.pos ? info.pos.x.toFixed(1) : 0}, ${info.pos ? info.pos.z.toFixed(1) : 0}`,
  ].join('\n');
}

animate();
