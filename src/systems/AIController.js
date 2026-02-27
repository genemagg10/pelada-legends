import * as THREE from 'three';
import {
  COURT_WIDTH, COURT_LENGTH, TEAM_HOME, TEAM_AWAY,
  AI_REACTION_DELAY, BALL_POSSESSION_DIST,
} from '../constants.js';

/**
 * AIController manages the behavior of non-human players.
 * Supports teammate AI (co-op with human) and opponent AI.
 */
export class AIController {
  constructor() {
    this.reactionTimer = 0;
  }

  update(dt, aiPlayers, humanPlayer, ball, teammatePlayers, opponentPlayers, score) {
    this.reactionTimer += dt;

    for (const player of aiPlayers) {
      this._updatePlayer(dt, player, humanPlayer, ball, teammatePlayers, opponentPlayers, score);
    }
  }

  _updatePlayer(dt, player, humanPlayer, ball, allTeammates, allOpponents, score) {
    const pos = player.getPosition();
    const ballPos = new THREE.Vector3(ball.position.x, 0, ball.position.z);
    const distToBall = pos.distanceTo(ballPos);

    // Determine teammates and opponents for this player
    const myTeam = allTeammates.filter(p => p.team === player.team && p !== player);
    const opponents = allOpponents.filter(p => p.team !== player.team);

    // If player has ball
    if (player.hasBall) {
      this._attackWithBall(dt, player, ball, myTeam, opponents);
      return;
    }

    // Team-specific behavior
    const isOnPlayerTeam = humanPlayer && player.team === humanPlayer.team;

    if (isOnPlayerTeam) {
      this._teammateAI(dt, player, humanPlayer, ball, ballPos, distToBall, myTeam);
    } else {
      this._opponentAI(dt, player, ball, ballPos, distToBall, myTeam, opponents);
    }
  }

  _attackWithBall(dt, player, ball, teammates, opponents) {
    const pos = player.getPosition();
    const goalZ = player.team === TEAM_HOME ? COURT_LENGTH / 2 : -COURT_LENGTH / 2;
    const goalDist = Math.abs(goalZ - pos.z);

    // Check for nearby opponents
    let nearestOpponent = null;
    let nearestDist = Infinity;
    for (const opp of opponents) {
      const d = pos.distanceTo(opp.getPosition());
      if (d < nearestDist) {
        nearestDist = d;
        nearestOpponent = opp;
      }
    }

    // If close to goal and clear, shoot
    if (goalDist < 18 && (nearestDist > 3 || goalDist < 10)) {
      const goalDir = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        0,
        goalZ
      ).sub(pos).normalize();

      ball.velocity.set(
        goalDir.x * 22,
        1 + Math.random() * 2,
        goalDir.z * 22
      );
      return;
    }

    // If opponent is close, try to pass
    if (nearestDist < 4 && teammates.length > 0) {
      const bestTeammate = this._findBestPassTarget(pos, teammates, opponents, goalZ);
      if (bestTeammate) {
        const passDir = bestTeammate.getPosition().sub(pos).normalize();
        ball.velocity.set(
          passDir.x * 14,
          0.5,
          passDir.z * 14
        );
        return;
      }
    }

    // Otherwise, dribble toward goal
    const moveDir = new THREE.Vector3(0, 0, goalZ > 0 ? 1 : -1);

    // Add some lateral movement to avoid opponents
    if (nearestOpponent && nearestDist < 6) {
      const avoidDir = pos.clone().sub(nearestOpponent.getPosition()).normalize();
      moveDir.x += avoidDir.x * 0.5;
      moveDir.normalize();
    }

    player.move(moveDir, goalDist < 20);
  }

  _teammateAI(dt, player, humanPlayer, ball, ballPos, distToBall, myTeam) {
    const pos = player.getPosition();
    const goalZ = player.team === TEAM_HOME ? COURT_LENGTH / 2 : -COURT_LENGTH / 2;

    // If human has ball, find supporting position
    if (humanPlayer && humanPlayer.hasBall) {
      const humanPos = humanPlayer.getPosition();
      // Position ahead and to the side
      const supportPos = new THREE.Vector3(
        humanPos.x + (player.body.position.x > 0 ? 6 : -6),
        0,
        humanPos.z + (goalZ > 0 ? 8 : -8)
      );
      // Clamp to court
      supportPos.x = THREE.MathUtils.clamp(supportPos.x, -COURT_WIDTH / 2 + 2, COURT_WIDTH / 2 - 2);
      supportPos.z = THREE.MathUtils.clamp(supportPos.z, -COURT_LENGTH / 2 + 2, COURT_LENGTH / 2 - 2);

      const moveDir = supportPos.sub(pos).normalize();
      player.move(moveDir, false);
      return;
    }

    // Chase loose ball if close
    if (distToBall < 12 && !this._anyTeammateCloser(player, ball, myTeam)) {
      const moveDir = ballPos.clone().sub(pos).normalize();
      player.move(moveDir, distToBall < 5);
      return;
    }

    // Default: hold position
    const homeX = player.body.position.x > 0 ? 8 : -8;
    const homeZ = goalZ > 0 ? 5 : -5;
    const homePos = new THREE.Vector3(homeX, 0, homeZ);
    const moveDir = homePos.sub(pos);

    if (moveDir.length() > 2) {
      player.move(moveDir.normalize(), false);
    } else {
      player.move(new THREE.Vector3(0, 0, 0));
    }
  }

  _opponentAI(dt, player, ball, ballPos, distToBall, myTeam, opponents) {
    const pos = player.getPosition();
    const goalZ = player.team === TEAM_HOME ? COURT_LENGTH / 2 : -COURT_LENGTH / 2;
    const defenseZ = player.team === TEAM_HOME ? COURT_LENGTH / 4 : -COURT_LENGTH / 4;

    // Aggressive chase if ball is in our half
    const ballInOurHalf = (player.team === TEAM_AWAY && ball.position.z < 0) ||
                          (player.team === TEAM_HOME && ball.position.z > 0);

    // Chase ball if closest on team
    if (distToBall < 15 && !this._anyTeammateCloser(player, ball, myTeam)) {
      const moveDir = ballPos.clone().sub(pos).normalize();
      player.move(moveDir, distToBall < 8);
      return;
    }

    // Defend goal area
    if (ballInOurHalf) {
      const defendPos = new THREE.Vector3(
        THREE.MathUtils.clamp(ball.position.x * 0.6, -COURT_WIDTH / 3, COURT_WIDTH / 3),
        0,
        defenseZ
      );
      const moveDir = defendPos.sub(pos);
      if (moveDir.length() > 2) {
        player.move(moveDir.normalize(), true);
      } else {
        player.move(new THREE.Vector3(0, 0, 0));
      }
      return;
    }

    // Attack positioning
    const attackPos = new THREE.Vector3(
      (Math.random() - 0.5) * COURT_WIDTH * 0.6,
      0,
      goalZ * 0.4
    );
    const moveDir = attackPos.sub(pos);
    if (moveDir.length() > 3) {
      player.move(moveDir.normalize(), false);
    } else {
      player.move(new THREE.Vector3(0, 0, 0));
    }
  }

  _anyTeammateCloser(player, ball, teammates) {
    const myDist = new THREE.Vector3(player.body.position.x, 0, player.body.position.z)
      .distanceTo(new THREE.Vector3(ball.position.x, 0, ball.position.z));

    for (const mate of teammates) {
      const mateDist = new THREE.Vector3(mate.body.position.x, 0, mate.body.position.z)
        .distanceTo(new THREE.Vector3(ball.position.x, 0, ball.position.z));
      if (mateDist < myDist - 1) return true;
    }
    return false;
  }

  _findBestPassTarget(fromPos, teammates, opponents, goalZ) {
    let best = null;
    let bestScore = -Infinity;

    for (const mate of teammates) {
      const matePos = mate.getPosition();
      const distToGoal = Math.abs(goalZ - matePos.z);
      const distFromMe = fromPos.distanceTo(matePos);

      // Check if pass lane is clear
      let blocked = false;
      for (const opp of opponents) {
        const oppPos = opp.getPosition();
        const passDir = matePos.clone().sub(fromPos).normalize();
        const toOpp = oppPos.clone().sub(fromPos);
        const proj = toOpp.dot(passDir);
        if (proj > 0 && proj < distFromMe) {
          const perpDist = toOpp.clone().sub(passDir.clone().multiplyScalar(proj)).length();
          if (perpDist < 2) {
            blocked = true;
            break;
          }
        }
      }

      const score = (COURT_LENGTH - distToGoal) * 2 - distFromMe - (blocked ? 50 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = mate;
      }
    }

    return best;
  }
}
