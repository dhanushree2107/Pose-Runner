/* =========================================================
   POSE RUNNER - Game Over Screen Controller
   ========================================================= */

import { LeaderboardManager } from '../utils/leaderboard.js';
import confetti from 'canvas-confetti';

export class GameOverScreen {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.screenElement = document.getElementById('gameover-screen');

    // Stats elements
    this.scoreEl = document.getElementById('go-score');
    this.distanceEl = document.getElementById('go-distance');
    this.obstaclesEl = document.getElementById('go-obstacles');
    this.jumpsEl = document.getElementById('go-jumps');
    this.crouchesEl = document.getElementById('go-crouches');
    this.laneChangesEl = document.getElementById('go-lane-changes');
    this.reactionEl = document.getElementById('go-reaction-time');
    this.maxComboEl = document.getElementById('go-max-combo');
    this.recordBadge = document.getElementById('gameover-record-badge');

    // Buttons
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnRecalibrate = document.getElementById('btn-recalibrate');
    this.btnHowItWorks = document.getElementById('btn-go-how-it-works');
    this.btnLeaderboard = document.getElementById('btn-go-leaderboard');

    this.initEvents();
  }

  initEvents() {
    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener('click', () => {
        if (this.callbacks.onPlayAgain) {
          this.callbacks.onPlayAgain();
        }
      });
    }

    if (this.btnRecalibrate) {
      this.btnRecalibrate.addEventListener('click', () => {
        if (this.callbacks.onRecalibrate) {
          this.callbacks.onRecalibrate();
        }
      });
    }

    if (this.btnHowItWorks) {
      this.btnHowItWorks.addEventListener('click', () => {
        if (this.callbacks.onOpenExpo) {
          this.callbacks.onOpenExpo();
        }
      });
    }

    if (this.btnLeaderboard) {
      this.btnLeaderboard.addEventListener('click', () => {
        if (this.callbacks.onOpenLeaderboard) {
          this.callbacks.onOpenLeaderboard();
        }
      });
    }
  }

  show(stats) {
    this.screenElement.classList.add('active');

    if (this.scoreEl) this.scoreEl.textContent = stats.score.toLocaleString();
    if (this.distanceEl) this.distanceEl.textContent = stats.distance.toLocaleString();
    if (this.obstaclesEl) this.obstaclesEl.textContent = stats.obstaclesAvoided;
    if (this.jumpsEl) this.jumpsEl.textContent = stats.jumps;
    if (this.crouchesEl) this.crouchesEl.textContent = stats.crouches;
    if (this.laneChangesEl) this.laneChangesEl.textContent = stats.laneChanges;
    if (this.reactionEl) this.reactionEl.textContent = stats.reactionTime;
    if (this.maxComboEl) this.maxComboEl.textContent = `x${stats.maxCombo}`;

    // Save score to leaderboard
    const result = LeaderboardManager.saveScore('PLAYER', stats.score, stats.distance);
    if (result.isTopScore) {
      if (this.recordBadge) this.recordBadge.classList.remove('hidden');
      try {
        confetti({
          particleCount: 100,
          spread: 90,
          origin: { y: 0.5 }
        });
      } catch (e) {}
    } else {
      if (this.recordBadge) this.recordBadge.classList.add('hidden');
    }
  }

  hide() {
    this.screenElement.classList.remove('active');
  }
}
