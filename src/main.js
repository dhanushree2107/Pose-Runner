/* =========================================================
   POSE RUNNER - Main Application Controller
   ========================================================= */

import { GAME_STATES, ACTIONS } from './utils/constants.js';
import { audioSynth } from './utils/audioSynth.js';
import { PoseTracker } from './vision/poseTracker.js';
import { CalibrationManager } from './vision/calibrationManager.js';
import { MovementDetector } from './vision/movementDetector.js';
import { LandmarkRenderer } from './vision/landmarkRenderer.js';
import { GameEngine } from './game/GameEngine.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { CalibrationScreen } from './components/CalibrationScreen.js';
import { GameOverScreen } from './components/GameOverScreen.js';
import { ModalManager } from './components/Modals.js';

class App {
  constructor() {
    this.currentState = GAME_STATES.WELCOME;

    // Vision subsystems
    this.calibrationManager = new CalibrationManager();
    this.movementDetector = new MovementDetector(this.calibrationManager);
    this.poseTracker = new PoseTracker();

    // DOM references for PiP Camera panel
    this.gameScreen = document.getElementById('game-screen');
    this.pipCanvas = document.getElementById('pip-canvas');
    this.pipActionText = document.getElementById('detected-action-text');
    this.pipLeanIndicator = document.getElementById('pip-lean-indicator');
    this.pipVertIndicator = document.getElementById('pip-vert-indicator');
    this.pipZoneText = document.getElementById('pip-zone-text');
    this.pipVertText = document.getElementById('pip-vert-text');
    this.videoElement = document.getElementById('webcam-raw');

    // Toolbar controls
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');
    this.btnFullscreen = document.getElementById('btn-fullscreen-toggle');
    this.btnControlMode = document.getElementById('btn-keyboard-mode');
    this.controlModeText = document.getElementById('control-mode-text');

    // Modals
    this.modalManager = new ModalManager({
      onStartCalibration: () => this.goToCalibration(),
      onRetryCamera: () => this.startCameraTracking(),
      onEnableKeyboardFallback: () => {
        this.movementDetector.setControlMode('KEYBOARD');
        this.updateControlModeUI();
        this.goToGame();
      }
    });

    // Screen controllers
    this.welcomeScreen = new WelcomeScreen({
      onStartCalibration: () => this.goToCalibration(),
      onOpenControls: () => this.modalManager.openControlsModal(),
      onOpenExpo: () => this.modalManager.openExpoModal(),
      onOpenTech: () => this.modalManager.openTechModal()
    });

    this.calibrationScreen = new CalibrationScreen(this.calibrationManager, {
      onStartGame: () => this.goToGame(),
      onCancel: () => this.goToWelcome()
    });

    this.gameOverScreen = new GameOverScreen({
      onPlayAgain: () => this.goToGame(),
      onRecalibrate: () => this.goToCalibration(),
      onOpenExpo: () => this.modalManager.openExpoModal(),
      onOpenLeaderboard: () => this.modalManager.openLeaderboardModal()
    });

    // 3D Game Engine
    const gameContainer = document.getElementById('game-canvas-container');
    this.gameEngine = new GameEngine(gameContainer, {
      onGameOver: (stats) => this.handleGameOver(stats)
    });

    this.initVisionPipeline();
    this.initToolbarEvents();
  }

  initToolbarEvents() {
    // Sound Mute Toggle
    if (this.btnSoundToggle) {
      this.btnSoundToggle.addEventListener('click', () => {
        const isMuted = audioSynth.toggleMute();
        if (this.soundIcon) {
          this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
        }
      });
    }

    // Fullscreen Toggle
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Control Mode Toggle (AI POSE vs KEYBOARD DEMO)
    if (this.btnControlMode) {
      this.btnControlMode.addEventListener('click', () => {
        this.movementDetector.toggleControlMode();
        this.updateControlModeUI();
      });
    }

    // Keyboard Shortcuts (M for mute, F for fullscreen)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = audioSynth.toggleMute();
        if (this.soundIcon) this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
  }

  updateControlModeUI() {
    const isKeyboard = this.movementDetector.controlMode === 'KEYBOARD';
    if (this.controlModeText) {
      this.controlModeText.textContent = isKeyboard ? 'KEYBOARD DEMO (WASD)' : 'AI BODY TRACKING';
    }
    if (this.btnControlMode) {
      this.btnControlMode.classList.toggle('keyboard-active', isKeyboard);
    }
  }

  initVisionPipeline() {
    // 1. Listen for Landmark updates from MediaPipe PoseTracker
    this.poseTracker.onLandmarks((landmarks) => {
      if (this.currentState === GAME_STATES.CALIBRATING) {
        this.calibrationScreen.update(landmarks);
      } else if (this.currentState === GAME_STATES.PLAYING) {
        this.updateGameplayVision(landmarks);
      }
    });

    // 2. Camera error handling
    this.poseTracker.onError((err) => {
      console.warn('Webcam or MediaPipe error occurred:', err);
      this.modalManager.openCameraError(err);
    });

    // 3. Movement Action Events (from AI or Keyboard)
    this.movementDetector.onAction((action, details) => {
      if (this.currentState === GAME_STATES.PLAYING) {
        this.gameEngine.handleAction(action, details);
        this.updateActionBadge(action);
      }
    });
  }

  async startCameraTracking() {
    if (!this.poseTracker.isTracking) {
      const success = await this.poseTracker.start();
      if (!success) {
        console.warn('Camera could not start.');
      }
    }
  }

  updateGameplayVision(landmarks) {
    // Pass landmarks to movement classifier
    this.movementDetector.processLandmarks(landmarks);

    // Draw PiP skeleton
    LandmarkRenderer.drawSkeleton(this.pipCanvas, this.videoElement, landmarks, {
      primaryColor: '#00f3ff',
      jointColor: '#ffffff',
      lineWidth: 2,
      neutralCenter: this.calibrationManager.getBaseline()
    });

    // Update real-time balance gauges
    const metrics = this.movementDetector.getMetrics();

    if (this.pipLeanIndicator) {
      const leftPercent = 50 + (metrics.normalizedLean * 40);
      this.pipLeanIndicator.style.left = `${Math.max(5, Math.min(95, leftPercent))}%`;
    }

    if (this.pipZoneText) {
      if (metrics.targetLane === -1) {
        this.pipZoneText.textContent = 'LEFT';
        this.pipZoneText.style.color = '#00d4ff';
      } else if (metrics.targetLane === 1) {
        this.pipZoneText.textContent = 'RIGHT';
        this.pipZoneText.style.color = '#ff007f';
      } else {
        this.pipZoneText.textContent = 'CENTER';
        this.pipZoneText.style.color = '#00ff88';
      }
    }

    if (this.pipVertIndicator) {
      const vertPercent = 50 - (metrics.normalizedVert * 40);
      this.pipVertIndicator.style.left = `${Math.max(5, Math.min(95, vertPercent))}%`;
    }

    if (this.pipVertText) {
      if (metrics.normalizedVert > 0.16) {
        this.pipVertText.textContent = 'JUMP';
        this.pipVertText.style.color = '#00ff88';
      } else if (metrics.normalizedVert < -0.18) {
        this.pipVertText.textContent = 'CROUCH';
        this.pipVertText.style.color = '#ffb703';
      } else {
        this.pipVertText.textContent = 'STAND';
        this.pipVertText.style.color = '#8b9bb4';
      }
    }
  }

  updateActionBadge(action) {
    if (!this.pipActionText) return;

    this.pipActionText.textContent = action;
    this.pipActionText.className = 'action-highlight';

    if (action === ACTIONS.JUMP) {
      this.pipActionText.classList.add('action-jump');
    } else if (action === ACTIONS.CROUCH) {
      this.pipActionText.classList.add('action-crouch');
    } else if (action === ACTIONS.LEAN_LEFT) {
      this.pipActionText.classList.add('action-left');
    } else if (action === ACTIONS.LEAN_RIGHT) {
      this.pipActionText.classList.add('action-right');
    }
  }

  // --- STATE TRANSITIONS ---

  goToWelcome() {
    this.currentState = GAME_STATES.WELCOME;
    this.calibrationScreen.hide();
    this.gameScreen.classList.remove('active');
    this.gameOverScreen.hide();
    this.welcomeScreen.show();
  }

  async goToCalibration() {
    this.welcomeScreen.hide();
    this.gameOverScreen.hide();
    this.gameScreen.classList.remove('active');

    this.currentState = GAME_STATES.CALIBRATING;
    this.calibrationScreen.show();

    // Start webcam if not active
    await this.startCameraTracking();
  }

  goToGame() {
    this.welcomeScreen.hide();
    this.calibrationScreen.hide();
    this.gameOverScreen.hide();

    this.currentState = GAME_STATES.PLAYING;
    this.gameScreen.classList.add('active');

    // Ensure camera is running
    this.startCameraTracking();

    // Launch game engine
    this.gameEngine.startGame();
  }

  handleGameOver(stats) {
    this.currentState = GAME_STATES.GAMEOVER;
    this.gameScreen.classList.remove('active');
    this.gameOverScreen.show(stats);
  }
}

// Instantiate application once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
