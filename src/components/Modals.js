/* =========================================================
   POSE RUNNER - Modals & Educational Panels Controller
   ========================================================= */

import { LeaderboardManager } from '../utils/leaderboard.js';

export class ModalManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    // Modals
    this.expoModal = document.getElementById('expo-modal');
    this.controlsModal = document.getElementById('controls-modal');
    this.techModal = document.getElementById('tech-modal');
    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.cameraErrorModal = document.getElementById('camera-error-modal');

    this.leaderboardTbody = document.getElementById('leaderboard-tbody');
    this.btnResetLeaderboard = document.getElementById('btn-reset-leaderboard');
    this.btnControlsCalibrate = document.getElementById('btn-controls-calibrate');
    this.btnRetryCamera = document.getElementById('btn-retry-camera');
    this.btnKeyboardFallback = document.getElementById('btn-enable-keyboard-fallback');
    this.cameraErrorDesc = document.getElementById('camera-error-desc');

    this.initCloseButtons();
    this.initCustomActions();
  }

  initCloseButtons() {
    // Universal close button handler via data-close-modal
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          this.closeModal(modal);
        }
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.cyber-modal .modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        const parentModal = e.target.closest('.cyber-modal');
        if (parentModal && parentModal.id !== 'camera-error-modal') {
          this.closeModal(parentModal);
        }
      });
    });
  }

  initCustomActions() {
    // Controls modal "Ready to Calibrate" button
    if (this.btnControlsCalibrate) {
      this.btnControlsCalibrate.addEventListener('click', () => {
        this.closeModal(this.controlsModal);
        if (this.callbacks.onStartCalibration) {
          this.callbacks.onStartCalibration();
        }
      });
    }

    // Leaderboard Reset
    if (this.btnResetLeaderboard) {
      this.btnResetLeaderboard.addEventListener('click', () => {
        if (confirm('Reset local leaderboard scores?')) {
          LeaderboardManager.resetScores();
          this.renderLeaderboard();
        }
      });
    }

    // Camera Retry
    if (this.btnRetryCamera) {
      this.btnRetryCamera.addEventListener('click', () => {
        this.closeModal(this.cameraErrorModal);
        if (this.callbacks.onRetryCamera) {
          this.callbacks.onRetryCamera();
        }
      });
    }

    // Enable Keyboard Fallback from Camera Error Modal
    if (this.btnKeyboardFallback) {
      this.btnKeyboardFallback.addEventListener('click', () => {
        this.closeModal(this.cameraErrorModal);
        if (this.callbacks.onEnableKeyboardFallback) {
          this.callbacks.onEnableKeyboardFallback();
        }
      });
    }
  }

  openModal(modal) {
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeModal(modal) {
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  openExpoModal() {
    this.openModal(this.expoModal);
  }

  openControlsModal() {
    this.openModal(this.controlsModal);
  }

  openTechModal() {
    this.openModal(this.techModal);
  }

  openLeaderboardModal() {
    this.renderLeaderboard();
    this.openModal(this.leaderboardModal);
  }

  renderLeaderboard() {
    if (!this.leaderboardTbody) return;
    const scores = LeaderboardManager.getScores();

    this.leaderboardTbody.innerHTML = scores.map(s => `
      <tr>
        <td><strong class="${s.rank === 1 ? 'neon-gold' : ''}">#${s.rank}</strong></td>
        <td>${s.name}</td>
        <td class="neon-gold">${s.score.toLocaleString()}</td>
        <td>${s.distance} m</td>
        <td style="color: var(--text-dim); font-size: 0.8rem;">${s.date}</td>
      </tr>
    `).join('');
  }

  openCameraError(error) {
    if (this.cameraErrorDesc) {
      const msg = error?.message || 'Camera access was denied or device not found.';
      this.cameraErrorDesc.textContent = `“${msg}”`;
    }
    this.openModal(this.cameraErrorModal);
  }
}
