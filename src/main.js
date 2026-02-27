import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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
  MATCH_DURATION, BALL_POSSESSION_DIST, SHOOT_POWER, PASS_POWER,
} from './constants.js';

// ── Renderer Setup ──
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a00);
scene.fog = new THREE.FogExp2(0x332211, 0.008);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

// ── Lighting: Golden Hour ──
// Ambient
const ambient = new THREE.AmbientLight(0xffddaa, 0.3);
scene.add(ambient);

// Hemisphere light (sky: warm orange, ground: cool shadow)
const hemi = new THREE.HemisphereLight(0xffaa44, 0x443322, 0.5);
scene.add(hemi);

// Directional "sunset" light - low angle for long shadows
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

// Secondary fill light
const fillLight = new THREE.DirectionalLight(0xffcc88, 0.4);
fillLight.position.set(20, 10, 30);
scene.add(fillLight);

// ── Post-Processing (Unreal Bloom for Golden Hour Haze) ──
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,  // strength
  0.6,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);

// ── Systems ──
const physics = new PhysicsWorld();
const courtBuilder = new CourtBuilder(scene);
courtBuilder.build();

const cameraController = new CameraController(camera);
const inputManager = new InputManager();
const aiController = new AIController();
const ghostTrail = new GhostTrailEffect(scene);
const dustSystem = new DustParticleSystem(scene);
const ballEntity = new Ball(scene, physics.ballBody);

// ── Game State ──
let gameState = 'menu'; // 'menu', 'playing', 'goal', 'ended'
let scoreHome = 0;
let scoreAway = 0;
let matchTime = MATCH_DURATION;
let ginga = 0;
let humanPlayer = null;
let allPlayers = [];
let goalCooldown = 0;
let dustTimer = 0;

// ── UI ──
const uiManager = new UIManager();

uiManager.onStartGame = (selectedLegend) => {
  startMatch(selectedLegend);
};

// ── Player Spawning ──
function startMatch(selectedLegend) {
  // Clear existing players
  for (const p of allPlayers) {
    scene.remove(p.mesh);
  }
  allPlayers = [];

  // Home team (player's team) - attacking toward +Z
  const homePositions = [
    { x: 0, z: -10 },   // Human player
    { x: -8, z: -5 },   // AI teammate 1
    { x: 8, z: -5 },    // AI teammate 2
  ];

  // Away team - attacking toward -Z
  const awayPositions = [
    { x: 0, z: 10 },
    { x: -8, z: 5 },
    { x: 8, z: 5 },
  ];

  // Assign legends to AI players
  const availableLegends = LEGENDS.filter(l => l.id !== selectedLegend.id);

  // Human player
  const humanBody = physics.createPlayerBody(homePositions[0]);
  humanPlayer = new Player(scene, humanBody, selectedLegend, TEAM_HOME, true);
  allPlayers.push(humanPlayer);

  // Home AI teammates
  for (let i = 1; i < homePositions.length; i++) {
    const legend = availableLegends.splice(Math.floor(Math.random() * availableLegends.length), 1)[0];
    const body = physics.createPlayerBody(homePositions[i]);
    const player = new Player(scene, body, legend, TEAM_HOME, false);
    allPlayers.push(player);
  }

  // Away team
  for (let i = 0; i < awayPositions.length; i++) {
    const legend = availableLegends.splice(Math.floor(Math.random() * availableLegends.length), 1)[0];
    const body = physics.createPlayerBody(awayPositions[i]);
    const player = new Player(scene, body, legend, TEAM_AWAY, false);
    allPlayers.push(player);
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

// ── Special Move Manager ──
const specialMoveManager = new SpecialMoveManager(physics, ghostTrail);

// ── Goal Detection ──
function checkGoals() {
  if (goalCooldown > 0) return;

  const ballPos = physics.ballBody.position;
  const goalHW = 4; // GOAL_WIDTH / 2
  const hl = COURT_LENGTH / 2;

  // Check near goal (home team attacks toward +Z, so away goal at +Z)
  if (ballPos.z > hl + 1 && Math.abs(ballPos.x) < goalHW && ballPos.y < 3.5) {
    onGoal(TEAM_HOME);
    return;
  }

  // Check far goal (away team attacks toward -Z, so home goal at -Z)
  if (ballPos.z < -hl - 1 && Math.abs(ballPos.x) < goalHW && ballPos.y < 3.5) {
    onGoal(TEAM_AWAY);
    return;
  }
}

function onGoal(scoringTeam) {
  goalCooldown = 3;
  gameState = 'goal';

  if (scoringTeam === TEAM_HOME) {
    scoreHome++;
  } else {
    scoreAway++;
  }

  uiManager.updateScore(scoreHome, scoreAway);
  uiManager.showGoal();

  // Reset after delay
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

// ── Human Player Input Processing ──
function processInput(dt) {
  if (!humanPlayer || gameState !== 'playing') return;

  // Movement
  const moveDir = inputManager.getMoveDirection();
  const sprint = inputManager.isMoving();
  humanPlayer.move(moveDir, sprint);

  // Dust when sprinting
  if (sprint && moveDir.lengthSq() > 0.1) {
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

    // Check for active shot boost (Pelé)
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

    // Ginga charge on shoot
    ginga = Math.min(MAX_GINGA, ginga + 5);
    dustSystem.emit(physics.ballBody.position.x, 0, physics.ballBody.position.z, 8);
  }

  // Pass
  if (inputManager.isPassPressed() && humanPlayer.hasBall) {
    const teammates = allPlayers.filter(p => p.team === TEAM_HOME && p !== humanPlayer);
    if (teammates.length > 0) {
      // Find nearest teammate in front
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
  if (inputManager.isSpecialPressed()) {
    if (ginga >= GINGA_COST) {
      const activated = specialMoveManager.activate(humanPlayer, ballEntity, ginga);
      if (activated) {
        ginga = 0;
      }
    }
  }

  inputManager.clearJustPressed();
}

// ── Ginga Meter ──
function updateGinga(dt) {
  if (gameState !== 'playing') return;

  // Passive charge
  ginga = Math.min(MAX_GINGA, ginga + GINGA_CHARGE_RATE * dt);

  // Bonus for having ball
  if (humanPlayer && humanPlayer.hasBall) {
    ginga = Math.min(MAX_GINGA, ginga + GINGA_CHARGE_ON_DRIBBLE * dt * 0.5);
  }

  uiManager.updateGinga(ginga);
}

// ── Match Timer ──
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

    // Return to menu after delay
    setTimeout(() => {
      document.getElementById('select-screen').classList.remove('hidden');
      document.getElementById('hud').classList.remove('visible');
      gameState = 'menu';
    }, 5000);
  }
}

// ── Main Game Loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'playing') {
    // Process input
    processInput(dt);

    // Physics
    physics.update(dt);

    // Update all players
    const ballPos = ballEntity.getPosition();
    for (const player of allPlayers) {
      player.update(dt, ballPos);
    }

    // AI
    const aiPlayers = allPlayers.filter(p => !p.isHuman);
    aiController.update(dt, aiPlayers, humanPlayer, physics.ballBody, allPlayers, allPlayers, { home: scoreHome, away: scoreAway });

    // Special moves
    specialMoveManager.update(dt, allPlayers);

    // Goal detection
    goalCooldown = Math.max(0, goalCooldown - dt);
    checkGoals();

    // Ginga & timer
    updateGinga(dt);
    updateMatchTimer(dt);

    // Camera
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

  // Render with post-processing
  composer.render();
}

animate();

// ── Resize Handler ──
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
