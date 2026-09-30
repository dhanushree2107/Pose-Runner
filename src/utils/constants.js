/* =========================================================
   POSE RUNNER - Constants & Configuration
   ========================================================= */

export const LANES = {
  LEFT: -1,
  CENTER: 0,
  RIGHT: 1
};

export const LANE_X_POSITIONS = {
  [-1]: -3.2,
  [0]: 0.0,
  [1]: 3.2
};

export const GAME_STATES = {
  WELCOME: 'WELCOME',
  CALIBRATING: 'CALIBRATING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

export const ACTIONS = {
  NEUTRAL: 'RUNNING',
  LEAN_LEFT: 'LEAN LEFT',
  LEAN_RIGHT: 'LEAN RIGHT',
  JUMP: 'JUMP',
  CROUCH: 'CROUCH'
};

export const OBSTACLE_TYPES = {
  LOW_BARRIER: 'LOW_BARRIER', // Requires JUMP
  HIGH_LASER: 'HIGH_LASER',   // Requires CROUCH
  SIDE_OBSTACLE: 'SIDE_OBSTACLE', // Requires dodging to another lane
  CENTER_HAZARD: 'CENTER_HAZARD' // Requires dodging LEFT or RIGHT
};

export const LEVEL_CONFIGS = [
  {
    level: 1,
    name: 'SECTOR 01: INITIATION',
    speed: 1.0,
    spawnInterval: 2400, // ms
    description: 'Slow speed • Simple obstacles • Long reaction time',
    allowedObstacles: [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.SIDE_OBSTACLE],
    scoreThreshold: 1000
  },
  {
    level: 2,
    name: 'SECTOR 02: NEON SURGE',
    speed: 1.3,
    spawnInterval: 2000,
    description: 'Higher speed • Laser beams introduced',
    allowedObstacles: [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.HIGH_LASER, OBSTACLE_TYPES.SIDE_OBSTACLE],
    scoreThreshold: 2500
  },
  {
    level: 3,
    name: 'SECTOR 03: CYBER CROSSING',
    speed: 1.6,
    spawnInterval: 1700,
    description: 'Rapid multi-lane obstacles & mixed hazards',
    allowedObstacles: [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.HIGH_LASER, OBSTACLE_TYPES.SIDE_OBSTACLE, OBSTACLE_TYPES.CENTER_HAZARD],
    scoreThreshold: 5000
  },
  {
    level: 4,
    name: 'SECTOR 04: OVERDRIVE VELOCITY',
    speed: 2.0,
    spawnInterval: 1400,
    description: 'Fast obstacles • Tight reaction windows',
    allowedObstacles: [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.HIGH_LASER, OBSTACLE_TYPES.SIDE_OBSTACLE, OBSTACLE_TYPES.CENTER_HAZARD],
    scoreThreshold: 8500
  },
  {
    level: 5,
    name: 'SECTOR 05: SINGULARITY (CHALLENGE)',
    speed: 2.4,
    spawnInterval: 1150,
    description: 'Maximum speed • Hyper-reflex challenge mode',
    allowedObstacles: [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.HIGH_LASER, OBSTACLE_TYPES.SIDE_OBSTACLE, OBSTACLE_TYPES.CENTER_HAZARD],
    scoreThreshold: Infinity
  }
];

// MediaPipe Landmark Index Mapping (Full 33 Landmarks standard)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

// Movement classification thresholds (relative to normalized torso height)
export const DETECTION_CONFIG = {
  EMA_ALPHA: 0.35, // Smoothing factor (0 = full smooth, 1 = no smoothing)
  LEAN_THRESHOLD_RATIO: 0.22, // 22% of torso scale offset required to change lane
  JUMP_THRESHOLD_RATIO: 0.18, // 18% upward shift of hips to trigger jump
  CROUCH_THRESHOLD_RATIO: 0.22, // 22% downward shift of hips to trigger crouch
  COOLDOWN_LANE_MS: 380, // Cooldown between lane shifts
  COOLDOWN_ACTION_MS: 400, // Cooldown between jump/crouch triggers
  MIN_DETECTION_CONFIDENCE: 0.5
};
