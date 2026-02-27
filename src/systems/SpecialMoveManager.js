import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MAX_GINGA, GINGA_COST } from '../constants.js';

/**
 * SpecialMoveManager handles unique physics behaviors for each Legend.
 * Each special move manipulates the physics world differently.
 */
export class SpecialMoveManager {
  constructor(physicsWorld, ghostTrailEffect) {
    this.physics = physicsWorld;
    this.ghostTrail = ghostTrailEffect;
    this.activeEffects = [];
  }

  /**
   * Attempt to activate a special move for a player.
   * Returns true if the move was activated, false if conditions not met.
   */
  activate(player, ballEntity, ginga) {
    if (ginga < GINGA_COST) return false;
    if (!player.legend) return false;

    const legendId = player.legend.id;

    switch (legendId) {
      case 'roberto_carlos':
        return this._bananaBolt(player, ballEntity);
      case 'ronaldinho':
        return this._elasticoDribble(player, ballEntity);
      case 'r9':
        return this._unstoppableForce(player, ballEntity);
      case 'messi':
        return this._magnetTouch(player, ballEntity);
      case 'cr7':
        return this._powerHeader(player, ballEntity);
      case 'neymar':
        return this._rainbowFlick(player, ballEntity);
      case 'pele':
        return this._kingsTouch(player, ballEntity);
      default:
        return false;
    }
  }

  /**
   * Roberto Carlos - "Banana Bolt"
   * Apply the Magnus Effect: F_magnus = S * (omega x v)
   * High angular velocity creates extreme curve mid-air.
   */
  _bananaBolt(player, ballEntity) {
    if (!player.hasBall) return false;

    const ball = this.physics.ballBody;
    const shootDir = player.getGoalDir();

    // Strong forward impulse
    const power = 35;
    ball.velocity.set(
      shootDir.x * power,
      4, // slight loft
      shootDir.z * power
    );

    // High angular velocity for Magnus effect (spin on Y-axis)
    // The spin direction determines curve direction
    const spinSign = Math.random() > 0.5 ? 1 : -1;
    ball.angularVelocity.set(0, spinSign * 40, 0);

    // Register active Magnus effect
    this.activeEffects.push({
      type: 'magnus',
      ball,
      spinCoefficient: 0.8,
      duration: 2.0,
      elapsed: 0,
      trailColor: 0x44ff00,
    });

    ballEntity.setTrail(true, 0x44ff00);
    player.activateSpecial();
    return true;
  }

  /**
   * Ronaldinho - "Elastico" Teleport-Dribble
   * Rapid offset: 2 units laterally then 3 units forward instantly.
   * Leaves ghost-trail effect using custom shader.
   */
  _elasticoDribble(player, ballEntity) {
    const startPos = player.getPosition();

    // Spawn ghost at starting position
    if (this.ghostTrail) {
      this.ghostTrail.spawn(startPos, player.legend.color);
    }

    // Calculate lateral offset (perpendicular to facing direction)
    const forward = player.facingDir.clone().normalize();
    const lateral = new THREE.Vector3(-forward.z, 0, forward.x); // perpendicular

    // Step 1: 2 units lateral
    const lateralOffset = lateral.multiplyScalar(2);
    player.body.position.x += lateralOffset.x;
    player.body.position.z += lateralOffset.z;

    // Spawn ghost at lateral position
    if (this.ghostTrail) {
      this.ghostTrail.spawn(
        new THREE.Vector3(player.body.position.x, 0, player.body.position.z),
        player.legend.color
      );
    }

    // Step 2: 3 units forward
    const forwardOffset = forward.multiplyScalar(3);
    player.body.position.x += forwardOffset.x;
    player.body.position.z += forwardOffset.z;

    // Move ball with player
    if (player.hasBall) {
      this.physics.ballBody.position.x = player.body.position.x + forward.x * 0.8;
      this.physics.ballBody.position.z = player.body.position.z + forward.z * 0.8;
      this.physics.ballBody.position.y = 0.5;
      this.physics.ballBody.velocity.set(
        forward.x * 12,
        0,
        forward.z * 12
      );
    }

    // Spawn ghost at final position
    if (this.ghostTrail) {
      this.ghostTrail.spawn(
        new THREE.Vector3(player.body.position.x, 0, player.body.position.z),
        player.legend.color
      );
    }

    player.activateSpecial();
    return true;
  }

  /**
   * Ronaldo R9 - "Unstoppable Force"
   * Increase mass and speed temporarily.
   * Collisions knock defenders back instead of stopping R9.
   */
  _unstoppableForce(player, ballEntity) {
    // Triple the mass
    player.body.mass = player.originalMass * 3;
    player.body.updateMassProperties();

    // Speed boost
    const currentVel = new CANNON.Vec3(
      player.body.velocity.x,
      player.body.velocity.y,
      player.body.velocity.z
    );
    if (currentVel.length() > 1) {
      currentVel.normalize();
      currentVel.scale(20, currentVel);
      player.body.velocity.copy(currentVel);
    }

    // Register knockback effect for collisions
    this.activeEffects.push({
      type: 'unstoppable',
      player,
      duration: 3.0,
      elapsed: 0,
    });

    player.activateSpecial();
    player.specialTimer = 3;
    return true;
  }

  /**
   * Messi - "Magnet Touch"
   * Shorten ball-to-player constraint distance.
   * Ball stays glued to feet during 90-degree turns.
   */
  _magnetTouch(player, ballEntity) {
    // Tighten ball-player distance
    this.activeEffects.push({
      type: 'magnet',
      player,
      ball: this.physics.ballBody,
      duration: 5.0,
      elapsed: 0,
      constraintDist: 0.6, // Very tight
    });

    player.activateSpecial();
    player.specialTimer = 5;
    return true;
  }

  /**
   * C. Ronaldo - "Power Header"
   * Massive jump height + downward strike force at apex.
   */
  _powerHeader(player, ballEntity) {
    // Launch player up
    player.body.velocity.y = 12;

    // Register header effect
    this.activeEffects.push({
      type: 'powerHeader',
      player,
      ball: this.physics.ballBody,
      duration: 1.5,
      elapsed: 0,
      hasStruck: false,
      apexReached: false,
    });

    player.activateSpecial();
    return true;
  }

  /**
   * Neymar - "Rainbow Flick"
   * Lob the ball up and over the nearest defender.
   */
  _rainbowFlick(player, ballEntity) {
    if (!player.hasBall) return false;

    const ball = this.physics.ballBody;
    const forward = player.facingDir.clone().normalize();

    // Lob the ball up and forward
    ball.velocity.set(
      forward.x * 10,
      14,
      forward.z * 10
    );
    ball.angularVelocity.set(-15, 0, 0);

    ballEntity.setTrail(true, 0xffff00);
    player.activateSpecial();

    // Clear trail after a bit
    this.activeEffects.push({
      type: 'trailTimer',
      ball: ballEntity,
      duration: 1.5,
      elapsed: 0,
    });

    return true;
  }

  /**
   * Pelé - "King's Touch"
   * Perfect first touch - instantly control any ball and boost next shot.
   */
  _kingsTouch(player, ballEntity) {
    const ball = this.physics.ballBody;

    // Stop the ball right at player's feet
    const forward = player.facingDir.clone().normalize();
    ball.position.x = player.body.position.x + forward.x * 1.0;
    ball.position.z = player.body.position.z + forward.z * 1.0;
    ball.position.y = 0.5;
    ball.velocity.set(0, 0, 0);
    ball.angularVelocity.set(0, 0, 0);

    // Boost next shot
    this.activeEffects.push({
      type: 'shotBoost',
      player,
      duration: 4.0,
      elapsed: 0,
      multiplier: 1.5,
    });

    player.activateSpecial();
    player.specialTimer = 4;
    return true;
  }

  /**
   * Update active effects each frame.
   * Called from main game loop.
   */
  update(dt, allPlayers) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.elapsed += dt;

      if (fx.elapsed >= fx.duration) {
        this._cleanupEffect(fx);
        this.activeEffects.splice(i, 1);
        continue;
      }

      switch (fx.type) {
        case 'magnus':
          this._updateMagnus(fx, dt);
          break;
        case 'unstoppable':
          this._updateUnstoppable(fx, dt, allPlayers);
          break;
        case 'magnet':
          this._updateMagnet(fx, dt);
          break;
        case 'powerHeader':
          this._updatePowerHeader(fx, dt);
          break;
      }
    }
  }

  /**
   * Magnus effect: F = S * (omega x v)
   * Apply lateral force perpendicular to ball velocity based on spin.
   */
  _updateMagnus(fx, dt) {
    const ball = fx.ball;
    const vel = ball.velocity;
    const omega = ball.angularVelocity;

    // Cross product: omega x velocity
    const fx_force = omega.y * vel.z - omega.z * vel.y;
    const fz_force = omega.x * vel.y - omega.y * vel.x;

    // Apply Magnus force
    const S = fx.spinCoefficient;
    ball.applyForce(new CANNON.Vec3(
      S * fx_force * dt * 60,
      0,
      S * fz_force * dt * 60
    ));

    // Decay spin over time
    ball.angularVelocity.y *= 0.98;
  }

  /**
   * Unstoppable force: knock nearby defenders away.
   */
  _updateUnstoppable(fx, dt, allPlayers) {
    const player = fx.player;
    const playerPos = new THREE.Vector3(player.body.position.x, 0, player.body.position.z);

    for (const other of allPlayers) {
      if (other === player || other.team === player.team) continue;

      const otherPos = new THREE.Vector3(other.body.position.x, 0, other.body.position.z);
      const dist = playerPos.distanceTo(otherPos);

      if (dist < 2.5) {
        // Knockback
        const knockDir = otherPos.clone().sub(playerPos).normalize();
        other.body.velocity.x = knockDir.x * 15;
        other.body.velocity.z = knockDir.z * 15;
        other.body.velocity.y = 3;
      }
    }
  }

  /**
   * Magnet touch: keep ball glued to player's feet.
   */
  _updateMagnet(fx, dt) {
    const player = fx.player;
    const ball = fx.ball;

    if (!player.hasBall && !player.isSpecialActive) return;

    const forward = player.facingDir.clone().normalize();
    const targetX = player.body.position.x + forward.x * fx.constraintDist;
    const targetZ = player.body.position.z + forward.z * fx.constraintDist;

    // Smoothly lerp ball position to target
    const lerpFactor = 0.3;
    ball.position.x += (targetX - ball.position.x) * lerpFactor;
    ball.position.z += (targetZ - ball.position.z) * lerpFactor;
    ball.position.y = 0.4;

    // Match ball velocity to player
    ball.velocity.x = player.body.velocity.x;
    ball.velocity.z = player.body.velocity.z;
    ball.velocity.y = 0;
  }

  /**
   * Power header: at jump apex, strike ball downward toward goal.
   */
  _updatePowerHeader(fx, dt) {
    const player = fx.player;
    const ball = fx.ball;

    // Detect apex (velocity y crosses zero going down)
    if (!fx.apexReached && player.body.velocity.y <= 0.5) {
      fx.apexReached = true;
    }

    if (fx.apexReached && !fx.hasStruck) {
      // Check if ball is near head height
      const headY = player.body.position.y + 1.0;
      const ballDist = Math.sqrt(
        Math.pow(ball.position.x - player.body.position.x, 2) +
        Math.pow(ball.position.z - player.body.position.z, 2)
      );

      if (ballDist < 3 && Math.abs(ball.position.y - headY) < 2) {
        // Downward strike toward goal
        const goalDir = player.getGoalDir();
        ball.velocity.set(
          goalDir.x * 30,
          -8,
          goalDir.z * 30
        );
        fx.hasStruck = true;
      }
    }
  }

  _cleanupEffect(fx) {
    if (fx.type === 'unstoppable' && fx.player) {
      fx.player.body.mass = fx.player.originalMass;
      fx.player.body.updateMassProperties();
    }
    if (fx.type === 'magnus' || fx.type === 'trailTimer') {
      if (fx.ball && fx.ball.setTrail) {
        fx.ball.setTrail(false);
      }
    }
  }
}
