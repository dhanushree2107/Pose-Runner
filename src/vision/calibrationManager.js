/* =========================================================
   POSE RUNNER - Calibration Manager & Neutral Baseline Capture
   ========================================================= */

import { POSE_LANDMARKS, DETECTION_CONFIG } from '../utils/constants.js';

export class CalibrationManager {
  constructor() {
    this.isCalibrated = false;
    this.baseline = null;
    this.verificationStatus = {
      head: false,
      shoulders: false,
      hips: false,
      fullBody: false
    };
    this.samples = [];
    this.isSampling = false;
  }

  /**
   * Check whether all required body parts are visible
   */
  evaluateLandmarks(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.verificationStatus = { head: false, shoulders: false, hips: false, fullBody: false };
      return {
        allReady: false,
        status: this.verificationStatus,
        feedback: 'No body detected. Step into the camera view.',
        torsoOffset: 0
      };
    }

    const nose = landmarks[POSE_LANDMARKS.NOSE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

    const conf = DETECTION_CONFIG.MIN_DETECTION_CONFIDENCE;

    const headVisible = (nose?.visibility ?? 1) >= conf;
    const shouldersVisible = (leftShoulder?.visibility ?? 1) >= conf && (rightShoulder?.visibility ?? 1) >= conf;
    const hipsVisible = (leftHip?.visibility ?? 1) >= conf && (rightHip?.visibility ?? 1) >= conf;
    const kneesVisible = (leftKnee?.visibility ?? 1) >= 0.35 && (rightKnee?.visibility ?? 1) >= 0.35;

    this.verificationStatus = {
      head: headVisible,
      shoulders: shouldersVisible,
      hips: hipsVisible,
      fullBody: kneesVisible
    };

    // Calculate torso center of mass
    let torsoCenter = null;
    let torsoOffset = 0;
    if (shouldersVisible && hipsVisible) {
      torsoCenter = {
        x: (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4,
        y: (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4
      };
      // Mirrored center deviation: 0.5 is ideal center
      torsoOffset = (torsoCenter.x - 0.5);
    }

    // Determine intuitive guidance message
    let feedback = 'Stand straight and center yourself in the guide box.';
    if (!headVisible && !shouldersVisible) {
      feedback = 'Please step in front of the camera.';
    } else if (!hipsVisible) {
      feedback = 'Please step back so your hips and torso are visible.';
    } else if (!kneesVisible) {
      feedback = 'Step slightly farther back so full body can be tracked.';
    } else if (Math.abs(torsoOffset) > 0.14) {
      feedback = torsoOffset > 0 ? '👈 Shift slightly to your right' : '👉 Shift slightly to your left';
    } else {
      feedback = '✓ Perfect position! Keep still and click [ CALIBRATE ]';
    }

    const allReady = headVisible && shouldersVisible && hipsVisible;

    // Collect samples if in active sampling countdown
    if (this.isSampling && allReady && torsoCenter) {
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipY = (leftHip.y + rightHip.y) / 2;
      const torsoScale = Math.abs(hipY - shoulderY);
      const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);

      // Mirrored coordinates (0 = screen Left, 1 = screen Right)
      const mirNoseX = 1 - (nose?.x ?? 0.5);
      const mirLShoulderX = 1 - leftShoulder.x;
      const mirRShoulderX = 1 - rightShoulder.x;
      const mirLHipX = 1 - leftHip.x;
      const mirRHipX = 1 - rightHip.x;

      const mirUpperX = (mirNoseX * 0.4 + (mirLShoulderX + mirRShoulderX) * 0.3);
      const mirHipX = (mirLHipX + mirRHipX) / 2;
      const mirSpineTiltX = mirUpperX - mirHipX;

      this.samples.push({
        torsoCenterX: torsoCenter.x,
        torsoCenterY: torsoCenter.y,
        hipY: hipY,
        shoulderY: shoulderY,
        torsoScale: Math.max(torsoScale, 0.18),
        shoulderWidth: Math.max(shoulderWidth, 0.14),
        mirUpperX: mirUpperX,
        mirHipX: mirHipX,
        mirSpineTiltX: mirSpineTiltX
      });
    }

    return {
      allReady,
      status: this.verificationStatus,
      feedback,
      torsoOffset,
      torsoCenter
    };
  }

  startSampling() {
    this.samples = [];
    this.isSampling = true;
  }

  finishSampling() {
    this.isSampling = false;
    if (this.samples.length < 5) {
      // Fallback default if not enough samples
      this.baseline = {
        torsoCenterX: 0.5,
        torsoCenterY: 0.5,
        hipY: 0.65,
        shoulderY: 0.35,
        torsoScale: 0.3,
        shoulderWidth: 0.22,
        mirUpperX: 0.5,
        mirHipX: 0.5,
        mirSpineTiltX: 0.0
      };
    } else {
      // Compute robust arithmetic mean of samples
      const n = this.samples.length;
      const sum = this.samples.reduce((acc, curr) => ({
        torsoCenterX: acc.torsoCenterX + curr.torsoCenterX,
        torsoCenterY: acc.torsoCenterY + curr.torsoCenterY,
        hipY: acc.hipY + curr.hipY,
        shoulderY: acc.shoulderY + curr.shoulderY,
        torsoScale: acc.torsoScale + curr.torsoScale,
        shoulderWidth: acc.shoulderWidth + curr.shoulderWidth,
        mirUpperX: acc.mirUpperX + curr.mirUpperX,
        mirHipX: acc.mirHipX + curr.mirHipX,
        mirSpineTiltX: acc.mirSpineTiltX + curr.mirSpineTiltX
      }), {
        torsoCenterX: 0,
        torsoCenterY: 0,
        hipY: 0,
        shoulderY: 0,
        torsoScale: 0,
        shoulderWidth: 0,
        mirUpperX: 0,
        mirHipX: 0,
        mirSpineTiltX: 0
      });

      this.baseline = {
        torsoCenterX: sum.torsoCenterX / n,
        torsoCenterY: sum.torsoCenterY / n,
        hipY: sum.hipY / n,
        shoulderY: sum.shoulderY / n,
        torsoScale: sum.torsoScale / n,
        shoulderWidth: sum.shoulderWidth / n,
        mirUpperX: sum.mirUpperX / n,
        mirHipX: sum.mirHipX / n,
        mirSpineTiltX: sum.mirSpineTiltX / n
      };
    }

    this.isCalibrated = true;
    return this.baseline;
  }

  getBaseline() {
    return this.baseline || {
      torsoCenterX: 0.5,
      torsoCenterY: 0.5,
      hipY: 0.65,
      shoulderY: 0.35,
      torsoScale: 0.3,
      shoulderWidth: 0.22,
      mirUpperX: 0.5,
      mirHipX: 0.5,
      mirSpineTiltX: 0.0
    };
  }
}
