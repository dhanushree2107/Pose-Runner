/* =========================================================
   POSE RUNNER - Master 3D Game Engine (Three.js)
   ========================================================= */

import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { Player } from './Player.js';
import { TrackManager } from './TrackManager.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CollectiblesManager } from './CollectiblesManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { LANES, ACTIONS, LEVEL_CONFIGS, GAME_STATES } from '../utils/constants.js';
import { audioSynth } from '../utils/audioSynth.js';

export class GameEngine {
  constructor(containerElement, callbacks = {}) {
    this.container = containerElement;
    this.callbacks = callbacks;

    this.gameState = GAME_STATES.WELCOME;
    this.clock = new THREE.Clock();

    // Game stats
    this.score = 0;
    this.distance = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.currentLevelIndex = 0;
    this.comboCount = 0;
    this.maxCombo = 1;

    // Detailed metrics for Expo game-over breakdown
    this.obstaclesAvoided = 0;
    this.jumpsCount = 0;
    this.crouchesCount = 0;
    this.laneChangesCount = 0;
    this.reactionTimes = [];
    this.lastObstacleNoticeTime = 0;

    // Camera shake
    this.shakeIntensity = 0;

    // Three.js Core
    this.initThree();

    // Game entities
    this.player = new Player(this.scene);
    this.track = new TrackManager(this.scene);
    this.obstacles = new ObstacleManager(this.scene);
    this.collectibles = new CollectiblesManager(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Window resize binding
    window.addEventListener('resize', () => this.onWindowResize());

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020308);
    this.scene.fog = new THREE.FogExp2(0x020308, 0.012);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Perspective Camera setup
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 300);
    this.baseCameraPos = new THREE.Vector3(0, 4.2, 7.5);
    this.baseCameraTarget = new THREE.Vector3(0, 1.8, -12);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(this.baseCameraTarget);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x161b36, 1.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.4);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xb026ff, 1.0);
    rimLight.position.set(-10, 15, -15);
    this.scene.add(rimLight);
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  startGame() {
    this.resetStats();
    this.gameState = GAME_STATES.PLAYING;
    this.clock.start();
    audioSynth.startBackgroundMusic();
    this.updateHud();
  }

  resetStats() {
    this.score = 0;
    this.distance = 0;
    this.lives = this.maxLives;
    this.currentLevelIndex = 0;
    this.comboCount = 0;
    this.maxCombo = 1;
    this.obstaclesAvoided = 0;
    this.jumpsCount = 0;
    this.crouchesCount = 0;
    this.laneChangesCount = 0;
    this.reactionTimes = [];
    this.shakeIntensity = 0;

    this.player.reset();
    this.track.reset();
    this.obstacles.reset();
    this.collectibles.reset();
    this.particles.reset();
  }

  /**
   * Translates incoming movement actions from the AI pose detector or keyboard
   */
  handleAction(action, details = {}) {
    if (this.gameState !== GAME_STATES.PLAYING) return;

    switch (action) {
      case ACTIONS.LEAN_LEFT: {
        let moved = false;
        if (details.targetLane !== undefined) {
          if (this.player.currentLane !== details.targetLane) {
            this.player.moveToLane(details.targetLane);
            moved = true;
          }
        } else {
          moved = this.player.shiftLane(-1);
        }
        if (moved) {
          this.laneChangesCount++;
          audioSynth.playLaneChange(-1);
          this.updateLaneIndicator();
        }
        break;
      }
      case ACTIONS.LEAN_RIGHT: {
        let moved = false;
        if (details.targetLane !== undefined) {
          if (this.player.currentLane !== details.targetLane) {
            this.player.moveToLane(details.targetLane);
            moved = true;
          }
        } else {
          moved = this.player.shiftLane(1);
        }
        if (moved) {
          this.laneChangesCount++;
          audioSynth.playLaneChange(1);
          this.updateLaneIndicator();
        }
        break;
      }
      case ACTIONS.JUMP: {
        const jumped = this.player.jump();
        if (jumped) {
          this.jumpsCount++;
          audioSynth.playJump();
        }
        break;
      }
      case ACTIONS.CROUCH: {
        const crouched = this.player.crouch(true);
        if (crouched) {
          this.crouchesCount++;
          audioSynth.playCrouch();
        }
        break;
      }
      case ACTIONS.NEUTRAL: {
        if (details.targetLane !== undefined) {
          if (this.player.currentLane !== details.targetLane) {
            this.player.moveToLane(details.targetLane);
            this.laneChangesCount++;
            audioSynth.playLaneChange(0);
            this.updateLaneIndicator();
          }
        }
        this.player.standUp();
        break;
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === GAME_STATES.PLAYING) {
      this.updateGame(dt);
    }

    this.render();
  }

  updateGame(dt) {
    const levelConfig = LEVEL_CONFIGS[this.currentLevelIndex] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    const baseSpeed = 26.0;
    const currentSpeed = baseSpeed * levelConfig.speed;

    // 1. Distance & Score accumulation
    this.distance += (currentSpeed * dt) * 0.5;
    this.score += Math.round(dt * 30 * levelConfig.speed * (1 + this.comboCount * 0.1));

    // Check Level Progression
    if (this.score >= levelConfig.scoreThreshold && this.currentLevelIndex < LEVEL_CONFIGS.length - 1) {
      this.levelUp();
    }

    // 2. Update Entities
    this.player.update(dt, levelConfig.speed);
    this.track.update(dt, currentSpeed);
    this.particles.update(dt, currentSpeed);

    // 3. Update Obstacles with collision & avoidance callbacks
    this.obstacles.update(dt, currentSpeed, levelConfig, this.player, {
      onCollision: (obstacle) => this.onPlayerHit(obstacle),
      onAvoided: (obstacle) => this.onObstacleAvoided(obstacle)
    });

    // 4. Update Collectibles
    this.collectibles.update(dt, currentSpeed, this.player, {
      onCollect: (orb) => this.onCollectOrb(orb)
    });

    // 5. Dynamic Camera Shake & Follow
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= dt * 3.5;
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      this.camera.position.set(
        this.baseCameraPos.x + this.player.mesh.position.x * 0.35 + sx,
        this.baseCameraPos.y + sy,
        this.baseCameraPos.z
      );
    } else {
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.mesh.position.x * 0.35, dt * 10);
      this.camera.position.y = this.baseCameraPos.y;
      this.camera.position.z = this.baseCameraPos.z;
    }

    // 6. Action Prompt for Upcoming Obstacles
    this.updateUpcomingObstaclePrompt();

    // 7. Update HUD
    this.updateHud();
  }

  onPlayerHit(obstacle) {
    this.lives--;
    this.shakeIntensity = 1.0;
    this.comboCount = 0;
    this.updateComboDisplay();

    audioSynth.playHit();
    this.player.triggerHit();

    // Screen red flash
    const hudContainer = document.getElementById('game-hud');
    if (hudContainer) {
      hudContainer.style.boxShadow = 'inset 0 0 50px rgba(255, 51, 85, 0.8)';
      setTimeout(() => {
        if (hudContainer) hudContainer.style.boxShadow = '';
      }, 350);
    }

    // Spawn collision sparks
    this.particles.createBurst(
      this.player.mesh.position.x,
      this.player.mesh.position.y + 1.0,
      this.player.mesh.position.z,
      0xff3355,
      30
    );

    // Update hearts display
    this.updateLivesDisplay(true);

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  onObstacleAvoided(obstacle) {
    this.obstaclesAvoided++;
    this.comboCount++;
    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
    }

    const bonus = 100 * Math.min(this.comboCount, 5);
    this.score += bonus;

    // Show floating score
    this.showFloatingScore(`+${bonus}`, '#00ff88');

    // Record reaction time estimate (200-400ms range typical for human visual-motor reflex)
    const simulatedReactionTime = 220 + Math.round(Math.random() * 110);
    this.reactionTimes.push(simulatedReactionTime);

    this.updateComboDisplay();
  }

  onCollectOrb(orb) {
    audioSynth.playCollect();
    const orbBonus = 150;
    this.score += orbBonus;
    this.showFloatingScore(`+${orbBonus}`, '#ffb703');

    this.particles.createBurst(
      orb.position.x,
      orb.position.y,
      orb.position.z,
      0xffb703,
      20
    );
  }

  levelUp() {
    this.currentLevelIndex++;
    const cfg = LEVEL_CONFIGS[this.currentLevelIndex];

    audioSynth.playLevelUp();

    // Fullscreen banner
    const banner = document.getElementById('levelup-banner');
    const desc = document.getElementById('levelup-desc');
    if (banner && desc) {
      desc.textContent = `${cfg.name} • ${cfg.description}`;
      banner.classList.remove('hidden');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 2500);
    }

    // Confetti celebration
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }

  updateUpcomingObstaclePrompt() {
    const promptEl = document.getElementById('obstacle-prompt');
    const iconEl = document.getElementById('prompt-icon');
    const textEl = document.getElementById('prompt-text');
    if (!promptEl || !iconEl || !textEl) return;

    const upcoming = this.obstacles.getUpcomingObstacle(this.player.mesh.position.z);
    if (upcoming && !upcoming.userData.cleared) {
      const req = upcoming.userData.requires;
      if (req === 'JUMP') {
        iconEl.textContent = '⬆️';
        textEl.textContent = 'JUMP!';
        promptEl.classList.remove('hidden');
      } else if (req === 'CROUCH') {
        iconEl.textContent = '⬇️';
        textEl.textContent = 'CROUCH!';
        promptEl.classList.remove('hidden');
      } else if (req === 'DODGE') {
        iconEl.textContent = '⚠️';
        textEl.textContent = 'DODGE!';
        promptEl.classList.remove('hidden');
      }
    } else {
      promptEl.classList.add('hidden');
    }
  }

  updateLaneIndicator() {
    const leftTab = document.getElementById('lane-left');
    const centerTab = document.getElementById('lane-center');
    const rightTab = document.getElementById('lane-right');

    if (leftTab) leftTab.classList.toggle('active', this.player.currentLane === LANES.LEFT);
    if (centerTab) centerTab.classList.toggle('active', this.player.currentLane === LANES.CENTER);
    if (rightTab) rightTab.classList.toggle('active', this.player.currentLane === LANES.RIGHT);
  }

  updateComboDisplay() {
    const pill = document.getElementById('combo-pill');
    const multiplier = document.getElementById('combo-multiplier');
    if (!pill || !multiplier) return;

    if (this.comboCount >= 2) {
      multiplier.textContent = `${this.comboCount}x`;
      pill.classList.remove('hidden');
    } else {
      pill.classList.add('hidden');
    }
  }

  updateLivesDisplay(animateLast = false) {
    const container = document.getElementById('hud-lives');
    if (!container) return;

    const hearts = container.querySelectorAll('.heart');
    hearts.forEach((heart, idx) => {
      if (idx < this.lives) {
        heart.classList.remove('lost');
        heart.classList.add('active');
      } else {
        heart.classList.remove('active');
        heart.classList.add('lost');
        if (animateLast && idx === this.lives) {
          heart.classList.add('animate-hit');
          setTimeout(() => heart.classList.remove('animate-hit'), 500);
        }
      }
    });
  }

  showFloatingScore(text, color = '#00ff88') {
    const container = document.getElementById('floating-scores');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'floating-score-item';
    item.textContent = text;
    item.style.color = color;
    item.style.left = `${40 + (Math.random() * 20)}%`;
    item.style.top = '45%';

    container.appendChild(item);
    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 1200);
  }

  updateHud() {
    const scoreEl = document.getElementById('hud-score');
    const distEl = document.getElementById('hud-distance');
    const speedEl = document.getElementById('hud-speed');
    const levelEl = document.getElementById('hud-level');

    if (scoreEl) scoreEl.textContent = String(this.score).padStart(4, '0');
    if (distEl) distEl.textContent = Math.round(this.distance);

    const cfg = LEVEL_CONFIGS[this.currentLevelIndex] || LEVEL_CONFIGS[0];
    if (speedEl) speedEl.textContent = cfg.speed.toFixed(1);
    if (levelEl) levelEl.textContent = String(cfg.level).padStart(2, '0');
  }

  gameOver() {
    this.gameState = GAME_STATES.GAMEOVER;
    audioSynth.stopBackgroundMusic();
    audioSynth.playGameOver();

    // Compute average reaction time
    let avgReaction = 285;
    if (this.reactionTimes.length > 0) {
      const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
      avgReaction = Math.round(sum / this.reactionTimes.length);
    }

    const stats = {
      score: this.score,
      distance: Math.round(this.distance),
      obstaclesAvoided: this.obstaclesAvoided,
      jumps: this.jumpsCount,
      crouches: this.crouchesCount,
      laneChanges: this.laneChangesCount,
      reactionTime: avgReaction,
      maxCombo: this.maxCombo
    };

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(stats);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
