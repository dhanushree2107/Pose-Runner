/* =========================================================
   POSE RUNNER - Landmark & Skeleton Canvas Visualizer
   ========================================================= */

import { POSE_LANDMARKS } from '../utils/constants.js';

// Standard MediaPipe Pose skeletal connections
export const POSE_CONNECTIONS = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // Left Arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],

  // Right Arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

  // Left Leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],

  // Right Leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE]
];

export class LandmarkRenderer {
  /**
   * Draw the video frame, neon skeleton, and landmarks onto a canvas
   */
  static drawSkeleton(canvas, videoElement, landmarks, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Draw video background
    if (videoElement && videoElement.readyState >= 2) {
      ctx.drawImage(videoElement, 0, 0, width, height);
      // Dark translucent tint over video to make neon skeleton pop
      ctx.fillStyle = 'rgba(8, 12, 28, 0.45)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#080c1c';
      ctx.fillRect(0, 0, width, height);
    }

    if (!landmarks || landmarks.length === 0) {
      ctx.restore();
      return;
    }

    const {
      primaryColor = '#00f3ff',
      jointColor = '#ffffff',
      torsoCenter = null,
      neutralCenter = null,
      showCenterCrosshair = true,
      lineWidth = 3
    } = options;

    // 2. Draw Connections (Bones)
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      if (!p1 || !p2) continue;
      const minVis = Math.min(p1.visibility ?? 1, p2.visibility ?? 1);
      if (minVis < 0.4) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);

      // Torso glows magenta, limbs glow cyan
      const isTorso = (startIdx === POSE_LANDMARKS.LEFT_SHOULDER && endIdx === POSE_LANDMARKS.RIGHT_SHOULDER) ||
                      (startIdx === POSE_LANDMARKS.LEFT_HIP && endIdx === POSE_LANDMARKS.RIGHT_HIP) ||
                      (startIdx === POSE_LANDMARKS.LEFT_SHOULDER && endIdx === POSE_LANDMARKS.LEFT_HIP) ||
                      (startIdx === POSE_LANDMARKS.RIGHT_SHOULDER && endIdx === POSE_LANDMARKS.RIGHT_HIP);

      ctx.strokeStyle = isTorso ? '#b026ff' : primaryColor;
      ctx.shadowColor = isTorso ? '#b026ff' : primaryColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // 3. Draw Landmark Points (Joints)
    const keyJoints = [
      POSE_LANDMARKS.NOSE,
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE
    ];

    for (const idx of keyJoints) {
      const lm = landmarks[idx];
      if (!lm || (lm.visibility ?? 1) < 0.4) continue;

      const px = lm.x * width;
      const py = lm.y * height;
      const radius = idx === POSE_LANDMARKS.NOSE ? 6 : 4;

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, 2 * Math.PI);
      ctx.fillStyle = idx === POSE_LANDMARKS.NOSE ? '#ff007f' : jointColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    // 4. Draw Torso Center & Calibrated Neutral Crosshair
    if (showCenterCrosshair && torsoCenter) {
      const cx = torsoCenter.x * width;
      const cy = torsoCenter.y * height;

      // Current center of mass
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.fill();

      // If calibrated neutral is known, draw offset line
      if (neutralCenter) {
        const nx = neutralCenter.x * width;
        const ny = neutralCenter.y * height;

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(nx, ny);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Neutral reference anchor
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffb703';
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
