import { LEGENDS, MAX_GINGA, TEAM_HOME } from '../constants.js';

export class UIManager {
  constructor() {
    this.selectScreen = document.getElementById('select-screen');
    this.hud = document.getElementById('hud');
    this.muralWall = document.getElementById('mural-wall');
    this.startBtn = document.getElementById('start-btn');
    this.scoreHome = document.getElementById('score-home');
    this.scoreAway = document.getElementById('score-away');
    this.matchTimer = document.getElementById('match-timer');
    this.gingaBar = document.getElementById('ginga-bar');
    this.hudPlayerIcon = document.getElementById('hud-player-icon');
    this.hudPlayerName = document.getElementById('hud-player-name');
    this.hudPlayerSpecial = document.getElementById('hud-player-special');
    this.specialHint = document.getElementById('special-hint');
    this.goalSplash = document.getElementById('goal-splash');
    this.gameMessage = document.getElementById('game-message');
    this.possessionChip = document.getElementById('possession-chip');
    this.possessionText = document.getElementById('possession-text');
    this.shootFlash = document.getElementById('shoot-flash');

    this.selectedLegend = null;
    this.onStartGame = null;

    this._buildMuralWall();
    this._setupEvents();
  }

  _buildMuralWall() {
    for (const legend of LEGENDS) {
      const card = document.createElement('div');
      card.className = 'legend-card';
      card.dataset.id = legend.id;

      const stats = [
        { label: 'SPD', value: legend.speed },
        { label: 'PWR', value: legend.power },
        { label: 'CTL', value: legend.control },
      ];

      card.innerHTML = `
        <span class="icon">${legend.icon}</span>
        <span class="name">${legend.name}</span>
        <span class="title">${legend.title}</span>
        <span class="special-name">${legend.specialName}</span>
        <span class="special-desc">${legend.specialDesc}</span>
        <div class="stats">
          ${stats.map((s) => `
            <div class="stat-bar">
              <span>${s.label}</span>
              <div class="bar"><div class="fill" style="height: ${s.value}%"></div></div>
            </div>
          `).join('')}
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.legend-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedLegend = legend;
      });

      this.muralWall.appendChild(card);
    }

    this.muralWall.children[0].click();
  }

  _setupEvents() {
    this.startBtn.addEventListener('click', () => {
      if (this.selectedLegend && this.onStartGame) {
        this.selectScreen.classList.add('hidden');
        this.hud.classList.add('visible');
        this.hudPlayerIcon.textContent = this.selectedLegend.icon;
        this.hudPlayerName.textContent = this.selectedLegend.name;
        this.hudPlayerSpecial.textContent = this.selectedLegend.specialName;
        this.specialHint.textContent = `[SHIFT] ${this.selectedLegend.specialName.toUpperCase()}`;
        this.onStartGame(this.selectedLegend);
      }
    });
  }

  updateScore(home, away) {
    this.scoreHome.textContent = home;
    this.scoreAway.textContent = away;
  }

  updateTimer(timeRemaining) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    this.matchTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  updateGinga(value) {
    const pct = Math.min(100, (value / MAX_GINGA) * 100);
    this.gingaBar.style.width = pct + '%';
    if (pct >= 100) this.gingaBar.classList.add('full');
    else this.gingaBar.classList.remove('full');
  }

  updatePossession(player) {
    this.possessionChip.classList.remove('you', 'rival');
    if (!player) {
      this.possessionText.textContent = 'LOOSE BALL';
      return;
    }
    const you = player.team === TEAM_HOME;
    this.possessionChip.classList.add(you ? 'you' : 'rival');
    const who = you ? (player.isHuman ? 'YOU' : 'TEAMMATE') : 'RIVAL';
    this.possessionText.textContent = `${who} · ${player.legend.name}`;
  }

  flashShoot() {
    this.shootFlash.classList.remove('flash');
    void this.shootFlash.offsetWidth;
    this.shootFlash.classList.add('flash');
  }

  showGoal() {
    this.goalSplash.classList.add('show');
    setTimeout(() => {
      this.goalSplash.classList.remove('show');
      this.goalSplash.classList.add('hide');
      setTimeout(() => {
        this.goalSplash.classList.remove('hide');
      }, 500);
    }, 1500);
  }

  showMessage(text, duration = 2000) {
    this.gameMessage.textContent = text;
    this.gameMessage.classList.add('show');
    setTimeout(() => {
      this.gameMessage.classList.remove('show');
    }, duration);
  }

  showMenu() {
    this.selectScreen.classList.remove('hidden');
    this.hud.classList.remove('visible');
  }
}
