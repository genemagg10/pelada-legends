import * as CANNON from 'cannon-es';
import {
  GRAVITY, BALL_RADIUS, BALL_MASS, BALL_RESTITUTION,
  WALL_RESTITUTION, COURT_WIDTH, COURT_LENGTH, WALL_HEIGHT, WALL_THICKNESS,
  GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH,
} from '../constants.js';

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, GRAVITY, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.3;

    // Materials
    this.groundMat = new CANNON.Material('ground');
    this.wallMat = new CANNON.Material('wall');
    this.ballMat = new CANNON.Material('ball');
    this.playerMat = new CANNON.Material('player');

    // Contact materials
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMat, this.groundMat, { friction: 0.6, restitution: 0.5 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMat, this.wallMat, { friction: 0.2, restitution: WALL_RESTITUTION }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.ballMat, this.playerMat, { friction: 0.5, restitution: 0.4 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.playerMat, this.groundMat, { friction: 0.8, restitution: 0.0 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.playerMat, this.wallMat, { friction: 0.3, restitution: 0.2 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.playerMat, this.playerMat, { friction: 0.5, restitution: 0.3 }
    ));

    this.ballBody = null;
    this.playerBodies = [];
    this.goalSensors = [];

    this._createGround();
    this._createWalls();
    this._createBall();
  }

  _createGround() {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(COURT_WIDTH / 2 + 10, 0.5, COURT_LENGTH / 2 + 10)),
      position: new CANNON.Vec3(0, -0.5, 0),
      material: this.groundMat,
    });
    this.world.addBody(body);
  }

  _createWalls() {
    const hw = COURT_WIDTH / 2;
    const hl = COURT_LENGTH / 2;
    const hh = WALL_HEIGHT / 2;
    const ht = WALL_THICKNESS / 2;
    const goalHW = GOAL_WIDTH / 2;

    // Side walls (left and right - along Z axis)
    this._addWall(new CANNON.Vec3(-hw - ht, hh, 0), new CANNON.Vec3(ht, hh, hl));
    this._addWall(new CANNON.Vec3(hw + ht, hh, 0), new CANNON.Vec3(ht, hh, hl));

    // End walls with goal openings
    // Back wall (Z = -hl) - two segments leaving goal gap
    const sideSegWidth = (COURT_WIDTH - GOAL_WIDTH) / 4;
    // Left segment
    this._addWall(
      new CANNON.Vec3(-hw / 2 - goalHW / 2, hh, -hl - ht),
      new CANNON.Vec3(sideSegWidth, hh, ht)
    );
    // Right segment
    this._addWall(
      new CANNON.Vec3(hw / 2 + goalHW / 2, hh, -hl - ht),
      new CANNON.Vec3(sideSegWidth, hh, ht)
    );
    // Goal top bar
    this._addWall(
      new CANNON.Vec3(0, GOAL_HEIGHT + 0.25, -hl - ht),
      new CANNON.Vec3(goalHW, 0.25, ht)
    );

    // Front wall (Z = +hl) - two segments leaving goal gap
    this._addWall(
      new CANNON.Vec3(-hw / 2 - goalHW / 2, hh, hl + ht),
      new CANNON.Vec3(sideSegWidth, hh, ht)
    );
    this._addWall(
      new CANNON.Vec3(hw / 2 + goalHW / 2, hh, hl + ht),
      new CANNON.Vec3(sideSegWidth, hh, ht)
    );
    this._addWall(
      new CANNON.Vec3(0, GOAL_HEIGHT + 0.25, hl + ht),
      new CANNON.Vec3(goalHW, 0.25, ht)
    );

    // Goal posts (vertical)
    this._addWall(new CANNON.Vec3(-goalHW, hh / 2, -hl - ht), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, ht));
    this._addWall(new CANNON.Vec3(goalHW, hh / 2, -hl - ht), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, ht));
    this._addWall(new CANNON.Vec3(-goalHW, hh / 2, hl + ht), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, ht));
    this._addWall(new CANNON.Vec3(goalHW, hh / 2, hl + ht), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, ht));

    // Goal back nets (as walls)
    this._addWall(
      new CANNON.Vec3(0, GOAL_HEIGHT / 2, -hl - GOAL_DEPTH),
      new CANNON.Vec3(goalHW, GOAL_HEIGHT / 2, 0.1)
    );
    this._addWall(
      new CANNON.Vec3(0, GOAL_HEIGHT / 2, hl + GOAL_DEPTH),
      new CANNON.Vec3(goalHW, GOAL_HEIGHT / 2, 0.1)
    );

    // Goal side nets
    this._addWall(new CANNON.Vec3(-goalHW, GOAL_HEIGHT / 2, -hl - GOAL_DEPTH / 2), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, GOAL_DEPTH / 2));
    this._addWall(new CANNON.Vec3(goalHW, GOAL_HEIGHT / 2, -hl - GOAL_DEPTH / 2), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, GOAL_DEPTH / 2));
    this._addWall(new CANNON.Vec3(-goalHW, GOAL_HEIGHT / 2, hl + GOAL_DEPTH / 2), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, GOAL_DEPTH / 2));
    this._addWall(new CANNON.Vec3(goalHW, GOAL_HEIGHT / 2, hl + GOAL_DEPTH / 2), new CANNON.Vec3(0.1, GOAL_HEIGHT / 2, GOAL_DEPTH / 2));

    // Goal sensors (trigger volumes to detect goals)
    this._createGoalSensor(new CANNON.Vec3(0, GOAL_HEIGHT / 2, -hl - GOAL_DEPTH / 2), 'home');
    this._createGoalSensor(new CANNON.Vec3(0, GOAL_HEIGHT / 2, hl + GOAL_DEPTH / 2), 'away');
  }

  _addWall(pos, halfExtents) {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(halfExtents),
      position: pos,
      material: this.wallMat,
    });
    this.world.addBody(body);
    return body;
  }

  _createGoalSensor(pos, team) {
    const body = new CANNON.Body({
      mass: 0,
      isTrigger: true,
      shape: new CANNON.Box(new CANNON.Vec3(GOAL_WIDTH / 2 - 0.3, GOAL_HEIGHT / 2, GOAL_DEPTH / 2 - 0.3)),
      position: pos,
    });
    body.userData = { goalTeam: team };
    this.world.addBody(body);
    this.goalSensors.push(body);
  }

  _createBall() {
    this.ballBody = new CANNON.Body({
      mass: BALL_MASS,
      shape: new CANNON.Sphere(BALL_RADIUS),
      position: new CANNON.Vec3(0, BALL_RADIUS + 0.1, 0),
      material: this.ballMat,
      linearDamping: 0.25,
      angularDamping: 0.4,
    });
    this.world.addBody(this.ballBody);
  }

  createPlayerBody(position) {
    const body = new CANNON.Body({
      mass: 70,
      shape: new CANNON.Cylinder(0.5, 0.5, 1.8, 8),
      position: new CANNON.Vec3(position.x, 0.9, position.z),
      material: this.playerMat,
      linearDamping: 0.9,
      angularDamping: 0.99,
      fixedRotation: true,
    });
    this.world.addBody(body);
    this.playerBodies.push(body);
    return body;
  }

  resetBall() {
    this.ballBody.position.set(0, BALL_RADIUS + 0.1, 0);
    this.ballBody.velocity.set(0, 0, 0);
    this.ballBody.angularVelocity.set(0, 0, 0);
  }

  update(dt) {
    this.world.step(1 / 60, dt, 3);
  }
}
