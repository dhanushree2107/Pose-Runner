/* =========================================================
   POSE RUNNER - Welcome Screen Controller
   ========================================================= */

import { LeaderboardManager } from '../utils/leaderboard.js';

export class WelcomeScreen {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.screenElement = document.getElementById('welcome-screen');
    this.highScoreEl = document.getElementById('welcome-high-score');

    this.initEvents();
    this.updateHighScoreDisplay();
  }

  initEvents() {
    const playBtn = document.getElementById('btn-start-calibration');
    const controlsBtn = document.getElementById('btn-open-controls');
    const expoBtn = document.getElementById('btn-open-expo');
    const techBtn = document.getElementById('btn-open-tech');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.callbacks.onStartCalibration) {
          this.callbacks.onStartCalibration();
        }
      });
    }

    if (controlsBtn) {
      controlsBtn.addEventListener('click', () => {
        if (this.callbacks.onOpenControls) {
          this.callbacks.onOpenControls();
        }
      });
    }

    if (expoBtn) {
      expoBtn.addEventListener('click', () => {
        if (this.callbacks.onOpenExpo) {
          this.callbacks.onOpenExpo();
        }
      });
    }

    if (techBtn) {
      techBtn.addEventListener('click', () => {
        if (this.callbacks.onOpenTech) {
          this.callbacks.onOpenTech();
        }
      });
    }
  }

  updateHighScoreDisplay() {
    if (this.highScoreEl) {
      const topScore = LeaderboardManager.getHighScore();
      this.highScoreEl.textContent = topScore.toLocaleString();
    }
  }

  show() {
    this.updateHighScoreDisplay();
    this.screenElement.classList.add('active');
  }

  hide() {
    this.screenElement.classList.remove('active');
  }
}
