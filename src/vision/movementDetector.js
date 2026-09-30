/* =========================================================
   POSE RUNNER - High-Accuracy Real-Time Movement Classifier
   ========================================================= */

import { ACTIONS, POSE_LANDMARKS, LANES } from '../utils/constants.js';

export class MovementDetector {
  constructor(calibrationManager) {
    this.calibrationManager = calibrationManager;
    this.currentAction = ACTIONS.NEUTRAL;
    this.actionListeners = [];

    // Smoothed values
    this.smoothedUpperX = null;
    this.smoothedSpineTiltX = null;
    this.smoothedHipY = null;

    // Movement metrics for UI gauges (-1 to +1)
    this.normalizedLean = 0; // Negative = Left, Positive = Right
    this.normalizedVert = 0; // Positive = Jump, Negative = Crouch

    // Target Lane state machine (starts in Center)
    this.targetLane = LANES.CENTER;

    // Cooldown trackers
    this.lastActionTime = 0;
    this.isCrouchingActive = false;

    // Control mode: 'POSE' or 'KEYBOARD'
    this.controlMode = 'POSE';
    this.setupKeyboardListeners();
  }

  onAction(callback) {
    this.actionListeners.push(callback);
  }

  emitAction(action, details = {}) {
    this.currentAction = action;
    this.actionListeners.forEach(cb => cb(action, details));
  }

  setControlMode(mode) {
    this.controlMode = mode;
    return this.controlMode;
  }

  toggleControlMode() {
    this.controlMode = this.controlMode === 'POSE' ? 'KEYBOARD' : 'POSE';
    return this.controlMode;
  }

  /**
   * High-accuracy anatomical movement processing
   */
  processLandmarks(landmarks) {
    if (this.controlMode !== 'POSE') return;
    if (!landmarks || landmarks.length === 0) {
      if (this.currentAction !== ACTIONS.NEUTRAL) {
        this.emitAction(ACTIONS.NEUTRAL);
      }
      return;
    }

    const baseline = this.calibrationManager.getBaseline();
    const nose = landmarks[POSE_LANDMARKS.NOSE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    // Convert to mirrored screen coordinates (0 = screen Left, 1 = screen Right)
    const mirNoseX = 1 - (nose?.x ?? 0.5);
    const mirLShoulderX = 1 - leftShoulder.x;
    const mirRShoulderX = 1 - rightShoulder.x;
    const mirLHipX = 1 - leftHip.x;
    const mirRHipX = 1 - rightHip.x;

    // Upper body lateral point (head + shoulders)
    const upperX = (mirNoseX * 0.4 + (mirLShoulderX + mirRShoulderX) * 0.3);
    const hipX = (mirLHipX + mirRHipX) / 2;
    const spineTiltX = upperX - hipX;
    const hipY = (leftHip.y + rightHip.y) / 2;

    // Exponential Moving Average (EMA) smoothing (alpha = 0.55 for snappy zero-lag response)
    const alpha = 0.55;
    if (this.smoothedUpperX === null) {
      this.smoothedUpperX = upperX;
      this.smoothedSpineTiltX = spineTiltX;
      this.smoothedHipY = hipY;
    } else {
      this.smoothedUpperX = alpha * upperX + (1 - alpha) * this.smoothedUpperX;
      this.smoothedSpineTiltX = alpha * spineTiltX + (1 - alpha) * this.smoothedSpineTiltX;
      this.smoothedHipY = alpha * hipY + (1 - alpha) * this.smoothedHipY;
    }

    // Baseline reference values
    const baseUpperX = baseline.mirUpperX ?? 0.5;
    const baseSpineTilt = baseline.mirSpineTiltX ?? 0.0;
    const baseHipY = baseline.hipY ?? 0.65;
    const scale = (baseline.shoulderWidth || 0.22) * 0.65;
    const torsoScale = baseline.torsoScale || 0.28;

    // =========================================================
    // 1. HORIZONTAL LEAN CLASSIFICATION (LEFT / CENTER / RIGHT)
    // =========================================================
    // deltaUpperX: negative when leaning left, positive when leaning right
    const deltaUpperX = this.smoothedUpperX - baseUpperX;
    const deltaSpineTilt = this.smoothedSpineTiltX - baseSpineTilt;

    // Composite lean: combines lateral upper body shift + spine angle
    const leanComposite = deltaUpperX + 0.65 * deltaSpineTilt;
    this.normalizedLean = Math.max(-1.5, Math.min(1.5, leanComposite / scale));

    // Thresholds with hysteresis
    const LEAN_OUT_THRESHOLD = 0.26;    // How far to lean to exit center lane
    const LEAN_RETURN_THRESHOLD = 0.12; // How far to return to snap back to center

    let nextLane = this.targetLane;

    if (this.targetLane === LANES.CENTER) {
      // Currently in Center Lane
      if (this.normalizedLean < -LEAN_OUT_THRESHOLD) {
        nextLane = LANES.LEFT;
      } else if (this.normalizedLean > LEAN_OUT_THRESHOLD) {
        nextLane = LANES.RIGHT;
      }
    } else if (this.targetLane === LANES.LEFT) {
      // Currently in Left Lane: keep unless returning towards center
      if (this.normalizedLean > -LEAN_RETURN_THRESHOLD) {
        nextLane = (this.normalizedLean > LEAN_OUT_THRESHOLD) ? LANES.RIGHT : LANES.CENTER;
      }
    } else if (this.targetLane === LANES.RIGHT) {
      // Currently in Right Lane: keep unless returning towards center
      if (this.normalizedLean < LEAN_RETURN_THRESHOLD) {
        nextLane = (this.normalizedLean < -LEAN_OUT_THRESHOLD) ? LANES.LEFT : LANES.CENTER;
      }
    }

    // If lane changed, emit immediate lane update
    if (nextLane !== this.targetLane) {
      const prevLane = this.targetLane;
      this.targetLane = nextLane;

      if (nextLane === LANES.LEFT) {
        this.emitAction(ACTIONS.LEAN_LEFT, { targetLane: LANES.LEFT, prevLane, source: 'POSE' });
      } else if (nextLane === LANES.RIGHT) {
        this.emitAction(ACTIONS.LEAN_RIGHT, { targetLane: LANES.RIGHT, prevLane, source: 'POSE' });
      } else {
        this.emitAction(ACTIONS.NEUTRAL, { targetLane: LANES.CENTER, prevLane, source: 'POSE' });
      }
    }

    // =========================================================
    // 2. VERTICAL ACTION CLASSIFICATION (JUMP & CROUCH)
    // =========================================================
    // deltaY: In screen coords, jumping UP decreases Y, so baseHipY - currentHipY > 0
    const deltaY = baseHipY - this.smoothedHipY;
    this.normalizedVert = Math.max(-1.5, Math.min(1.5, deltaY / torsoScale));

    const now = performance.now();
    const JUMP_THRESHOLD = 0.16;   // 16% upward torso shift
    const CROUCH_THRESHOLD = 0.18; // 18% downward squat shift

    if (this.normalizedVert > JUMP_THRESHOLD) {
      // Body moved UP (JUMP)
      if (now - this.lastActionTime > 350) {
        this.lastActionTime = now;
        this.emitAction(ACTIONS.JUMP, { normalizedVert: this.normalizedVert, source: 'POSE' });
      }
    } else if (this.normalizedVert < -CROUCH_THRESHOLD) {
      // Body moved DOWN (CROUCH)
      this.isCrouchingActive = true;
      this.emitAction(ACTIONS.CROUCH, { normalizedVert: this.normalizedVert, isHolding: true, source: 'POSE' });
    } else {
      if (this.isCrouchingActive) {
        this.isCrouchingActive = false;
        this.emitAction(ACTIONS.NEUTRAL, { targetLane: this.targetLane, source: 'POSE' });
      }
    }
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        const next = Math.max(LANES.LEFT, this.targetLane - 1);
        this.targetLane = next;
        this.emitAction(ACTIONS.LEAN_LEFT, { targetLane: next, source: 'KEYBOARD' });
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        const next = Math.min(LANES.RIGHT, this.targetLane + 1);
        this.targetLane = next;
        this.emitAction(ACTIONS.LEAN_RIGHT, { targetLane: next, source: 'KEYBOARD' });
      } else if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
        e.preventDefault();
        this.emitAction(ACTIONS.JUMP, { source: 'KEYBOARD' });
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.emitAction(ACTIONS.CROUCH, { isHolding: true, source: 'KEYBOARD' });
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.emitAction(ACTIONS.NEUTRAL, { targetLane: this.targetLane, source: 'KEYBOARD' });
      }
    });
  }

  resetLane() {
    this.targetLane = LANES.CENTER;
  }

  getMetrics() {
    return {
      currentAction: this.currentAction,
      normalizedLean: this.normalizedLean,
      normalizedVert: this.normalizedVert,
      targetLane: this.targetLane
    };
  }
}
