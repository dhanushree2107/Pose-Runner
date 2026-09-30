# 🏃‍♂️ POSE RUNNER
### *"Control the Game With Your Body"*
**A Real-Time Computer Vision & AI Endless Runner for College Science Expos**

---

## 🌟 Overview
**POSE RUNNER** is a cutting-edge, web-based 3D endless runner game where **your real physical body is the game controller**. Developed specifically for demonstration to 11th and 12th standard students at a College Science Expo, the project demystifies Artificial Intelligence, Machine Learning, and Computer Vision by turning real-time human kinematics into responsive, adrenaline-fueled gameplay.

**NO KEYBOARD OR MOUSE IS REQUIRED DURING NORMAL GAMEPLAY.**

---

## 🚀 Live Demo & Quick Start

### 1. Requirements
- Node.js (v18+)
- Any modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox)
- A standard laptop webcam

### 2. Launch
```bash
# In the project directory:
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> **Expo Pro-Tip:** Press `F` to enter Fullscreen mode and `M` to toggle the cyber synth audio!

---

## 🧠 How Computer Vision Controls the Game

The project implements a full 7-step edge-AI pipeline running directly in the browser:

```
WEBCAM 📷
   ↓ (30–60 FPS RGB video stream)
VIDEO FRAME 🖼️
   ↓ (Normalized image tensor)
POSE DETECTION 🧠
   ↓ (Google MediaPipe BlazePose deep neural network)
BODY LANDMARKS 📍
   ↓ (33 skeletal 3D keypoints: Nose, Shoulders, Elbows, Hips, Knees, Ankles)
MOVEMENT ANALYSIS 📐
   ↓ (EMA smoothing filter + scale-invariant torso delta calculation)
GAME COMMAND ⚡
   ↓ (Hysteresis threshold trigger: LEAN LEFT, LEAN RIGHT, JUMP, CROUCH)
CHARACTER ACTION 🏃
   ↓ (Three.js 3D procedural kinematics & collision physics)
```

### 🔬 Scale-Invariant Kinematic Normalization
In real-world webcam gaming, players stand at varying distances from the camera. If raw pixel offsets were used, players standing further away would find it harder to move. 

**Pose Runner solves this mathematically:**
1. During calibration, the system measures the player's **Torso Scale Factor**:
   $$\text{TorsoScale} = |Y_{\text{hips}} - Y_{\text{shoulders}}|$$
2. All horizontal and vertical movements are divided by this scale factor:
   $$\Delta X_{\text{normalized}} = \frac{X_{\text{torso}} - X_{\text{neutral}}}{\text{TorsoScale}}$$
   $$\Delta Y_{\text{normalized}} = \frac{Y_{\text{hips}} - Y_{\text{neutral}}}{\text{TorsoScale}}$$
3. An **Exponential Moving Average (EMA)** filter eliminates camera jitter:
   $$S_t = \alpha \cdot X_t + (1 - \alpha) \cdot S_{t-1}$$

---

## 🎮 Movement & Control Guide

| Physical Action | Screen / Camera Feedback | Game Reaction | Hazard Countered |
| :--- | :--- | :--- | :--- |
| **LEAN LEFT** | Torso center drifts left | Shifts to **Left Lane** | Avoids Right / Center Obstacles |
| **LEAN RIGHT** | Torso center drifts right | Shifts to **Right Lane** | Avoids Left / Center Obstacles |
| **JUMP** | Hips & shoulders move upward | **3D Jump Arc** | Clears Low Barriers & Spikes |
| **CROUCH / DUCK** | Hips drop downward | **Sliding Duck** | Slides under High Laser Gates |
| **STAND NEUTRAL** | Aligned in center box | Continues forward | Safe Running Stance |

> **Testing / Debug Mode:** The top-right toolbar features a toggle for **Keyboard Demo Mode** (`A` / `D` to steer, `W` / `Space` to jump, `S` to crouch) for testing without a camera.

---

## 🏆 Game Features
- **3D Endless Runner Engine**: Powered by **Three.js** with hardware-accelerated 60 FPS graphics, glowing neon tracks, holographic cyber skyline, and particle speed lines.
- **Progressive Level System**:
  - **Level 1 (Initiation)**: Speed 1.0x, gentle barriers.
  - **Level 2 (Neon Surge)**: Speed 1.3x, laser beams introduced.
  - **Level 3 (Cyber Crossing)**: Speed 1.6x, mixed multi-lane hazards.
  - **Level 4 (Overdrive Velocity)**: Speed 2.0x, tight reaction windows.
  - **Level 5 (Singularity - Challenge Mode)**: Speed 2.4x, maximum speed overdrive!
- **Science Expo Educational Panel**: Interactive pipeline diagram and movement mapping with live explanations of edge inference.
- **Picture-in-Picture (PiP) AI Vision Panel**: Displays real-time webcam feed, glowing neon skeleton, detected action badges, and dynamic balance gauges.
- **Procedural Cyber Audio Synthesizer**: Zero-latency retro synthwave sound effects and rolling basslines generated live using the Web Audio API.
- **Local Leaderboard**: Stores and ranks the top student runs for competition during the Science Expo!

---

## 📁 Project Architecture
```
pose-runner/
├── index.html                   # Semantic HTML5 app structure
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Fast development bundler config
├── README.md                    # Expo documentation
└── src/
    ├── main.js                  # Master application orchestrator
    ├── styles/
    │   ├── main.css             # Core layouts, variables, reset
    │   ├── cyberpunk-theme.css  # Futuristic cyber theme & animations
    │   ├── hud.css              # Heads-up display, PiP panel & Game Over
    │   └── modals.css           # Educational pipeline, controls & tables
    ├── utils/
    │   ├── constants.js         # Lanes, landmark indices, level configs
    │   ├── audioSynth.js        # Procedural Web Audio synthesizer
    │   └── leaderboard.js       # LocalStorage high-score manager
    ├── vision/
    │   ├── poseTracker.js       # Webcam stream & MediaPipe Pose loader
    │   ├── calibrationManager.js# Posture verification & baseline capture
    │   ├── movementDetector.js  # EMA smoothing, thresholds, hysteresis
    │   └── landmarkRenderer.js  # Neon skeleton canvas visualizer
    ├── game/
    │   ├── GameEngine.js        # Master Three.js render loop & state
    │   ├── Player.js            # 3D procedural humanoid cyber-runner
    │   ├── TrackManager.js      # Endless looping highway & skyline
    │   ├── ObstacleManager.js   # 3D barriers, laser gates, and hitboxes
    │   ├── CollectiblesManager.js# Floating cyber energy crystals
    │   └── ParticleSystem.js    # Speed lines, collision sparks, bursts
    └── components/
        ├── WelcomeScreen.js     # Landing view controller
        ├── CalibrationScreen.js # Pose verification & countdown controller
        ├── GameOverScreen.js    # Stats review & high-score celebrations
        └── Modals.js            # Expo "How AI Works", Tech, and Controls
```

---

## 🎓 Science Expo Presentation Tips for Students
1. **The 10-Second Hook**: Ask the student to stand in front of the laptop. Show them the live glowing skeleton on the screen.
2. **The Calibration Step**: Click `[ PLAY NOW ]`. Explain how the camera locks onto their baseline shoulder and hip height in 3 seconds.
3. **The Gameplay**: Have them lean left/right, jump over a red barrier, and duck under a cyan laser beam.
4. **The Science Behind It**: Click `[ HOW AI WORKS ]` to show how 33 coordinate numbers allow edge computers to understand body motion without cloud servers!
