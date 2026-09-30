/* =========================================================
   POSE RUNNER - Pose Calibration Screen Controller
   ========================================================= */

import { LandmarkRenderer } from '../vision/landmarkRenderer.js';
import { audioSynth } from '../utils/audioSynth.js';

export class CalibrationScreen {
  constructor(calibrationManager, callbacks = {}) {
    this.calibrationManager = calibrationManager;
    this.callbacks = callbacks;

    this.screenElement = document.getElementById('calibration-screen');
    this.canvas = document.getElementById('calibration-canvas');
    this.videoElement = document.getElementById('webcam-raw');

    // UI elements
    this.checkHead = document.getElementById('check-head');
    this.checkShoulders = document.getElementById('check-shoulders');
    this.checkHips = document.getElementById('check-hips');
    this.checkFullBody = document.getElementById('check-fullbody');
    this.postureMsg = document.getElementById('posture-msg');
    this.guideBox = document.getElementById('guide-box');
    this.meterVal = document.getElementById('meter-torso-val');
    this.meterBar = document.getElementById('meter-torso-bar');

    this.btnCalibrate = document.getElementById('btn-run-calibration');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnCancel = document.getElementById('btn-cancel-calibration');

    this.countdownOverlay = document.getElementById('calibration-countdown-overlay');
    this.countdownNum = document.getElementById('calib-countdown-num');

    this.isCountingDown = false;
    this.countdownTimer = null;

    this.initEvents();
  }

  initEvents() {
    if (this.btnCalibrate) {
      this.btnCalibrate.addEventListener('click', () => this.startCalibrationSequence());
    }

    if (this.btnStartGame) {
      this.btnStartGame.addEventListener('click', () => {
        if (this.callbacks.onStartGame) {
          this.callbacks.onStartGame();
        }
      });
    }

    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => {
        if (this.callbacks.onCancel) {
          this.callbacks.onCancel();
        }
      });
    }
  }

  show() {
    this.screenElement.classList.add('active');
    this.btnStartGame.classList.add('hidden');
    this.btnCalibrate.classList.remove('hidden');
    this.btnCalibrate.disabled = true;
    this.isCountingDown = false;
    this.countdownOverlay.classList.add('hidden');
  }

  hide() {
    this.screenElement.classList.remove('active');
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Called every frame from poseTracker while in calibration screen
   */
  update(landmarks) {
    if (!this.screenElement.classList.contains('active')) return;

    // 1. Evaluate landmarks with CalibrationManager
    const evalResult = this.calibrationManager.evaluateLandmarks(landmarks);

    // 2. Render video & neon skeleton to calibration canvas
    LandmarkRenderer.drawSkeleton(this.canvas, this.videoElement, landmarks, {
      primaryColor: evalResult.allReady ? '#00f3ff' : '#8899bb',
      torsoCenter: evalResult.torsoCenter,
      neutralCenter: this.calibrationManager.isCalibrated ? this.calibrationManager.getBaseline() : null
    });

    // 3. Update Verification Checklist UI
    this.updateChecklistItem(this.checkHead, evalResult.status.head, 'Head & Face Detected');
    this.updateChecklistItem(this.checkShoulders, evalResult.status.shoulders, 'Shoulders Detected');
    this.updateChecklistItem(this.checkHips, evalResult.status.hips, 'Hips Detected');
    this.updateChecklistItem(this.checkFullBody, evalResult.status.fullBody, 'Full Body / Knees Detected');

    // 4. Update Posture Guidance Message
    if (!this.isCountingDown) {
      this.postureMsg.textContent = evalResult.feedback;
    }

    // 5. Update Guide Silhouette Box State
    if (this.guideBox) {
      this.guideBox.classList.toggle('in-position', evalResult.allReady);
    }

    // 6. Update Torso Alignment Meter
    const offset = evalResult.torsoOffset; // -0.5 to +0.5
    if (this.meterVal) {
      this.meterVal.textContent = (offset > 0 ? '+' : '') + offset.toFixed(2);
    }
    if (this.meterBar) {
      const percent = Math.abs(offset) * 200;
      if (offset >= 0) {
        this.meterBar.style.left = '50%';
        this.meterBar.style.width = `${Math.min(50, percent / 2)}%`;
        this.meterBar.style.background = '#00f3ff';
      } else {
        const w = Math.min(50, percent / 2);
        this.meterBar.style.left = `${50 - w}%`;
        this.meterBar.style.width = `${w}%`;
        this.meterBar.style.background = '#b026ff';
      }
    }

    // 7. Calibrate Button Activation
    if (!this.isCountingDown && !this.calibrationManager.isCalibrated) {
      this.btnCalibrate.disabled = !evalResult.allReady;
    }
  }

  updateChecklistItem(element, isDetected, label) {
    if (!element) return;
    if (isDetected) {
      element.className = 'check-item detected';
      element.innerHTML = `<span class="check-icon">✓</span><span class="check-name">${label}</span>`;
    } else {
      element.className = 'check-item pending';
      element.innerHTML = `<span class="check-icon">⏳</span><span class="check-name">${label}</span>`;
    }
  }

  startCalibrationSequence() {
    if (this.isCountingDown) return;
    this.isCountingDown = true;
    this.btnCalibrate.disabled = true;

    this.calibrationManager.startSampling();
    this.countdownOverlay.classList.remove('hidden');

    let count = 3;
    this.countdownNum.textContent = count;
    audioSynth.playLaneChange(1);

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownNum.textContent = count;
        audioSynth.playLaneChange(1);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.finishCalibration();
      }
    }, 1000);
  }

  finishCalibration() {
    this.isCountingDown = false;
    this.countdownOverlay.classList.add('hidden');

    this.calibrationManager.finishSampling();
    audioSynth.playCalibrateConfirm();

    this.postureMsg.textContent = '🎉 Calibration Complete! Neutral baseline locked.';
    this.btnCalibrate.classList.add('hidden');
    this.btnStartGame.classList.remove('hidden');
  }
}
