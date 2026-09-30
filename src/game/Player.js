/* =========================================================
   POSE RUNNER - 3D Cyber-Runner Player Character
   ========================================================= */

import * as THREE from 'three';
import { LANES, LANE_X_POSITIONS } from '../utils/constants.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Movement state
    this.currentLane = LANES.CENTER;
    this.targetX = LANE_X_POSITIONS[LANES.CENTER];
    this.currentX = 0;
    this.y = 0;
    this.targetY = 0;
    this.velocityY = 0;
    this.gravity = -48.0;
    this.jumpStrength = 14.5;
    this.isJumping = false;
    this.isCrouching = false;

    // Running animation cycle
    this.runCycle = 0;
    this.runSpeed = 12.0;

    // Hit & Invulnerability state
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // Bounding Box for precise collision detection
    this.box = new THREE.Box3();
    this.hitboxHelper = null;

    this.buildCharacterMesh();
    this.scene.add(this.mesh);
  }

  buildCharacterMesh() {
    // Cyber Materials
    const armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x11162b,
      metalness: 0.85,
      roughness: 0.25
    });

    const neonCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });

    const neonMagentaMaterial = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 1.0,
      roughness: 0.1
    });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.95, 0.45);
    this.torso = new THREE.Mesh(torsoGeo, armorMaterial);
    this.torso.position.y = 1.35;
    this.mesh.add(this.torso);

    // Glowing Cyber Core
    const coreGeo = new THREE.BoxGeometry(0.35, 0.45, 0.47);
    const core = new THREE.Mesh(coreGeo, neonCyanMaterial);
    this.torso.add(core);

    // 2. Head & Visor
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.75;
    this.torso.add(headGroup);

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const head = new THREE.Mesh(headGeo, armorMaterial);
    headGroup.add(head);

    const visorGeo = new THREE.BoxGeometry(0.5, 0.16, 0.2);
    visorGeo.translate(0, 0.05, 0.18);
    const visor = new THREE.Mesh(visorGeo, neonCyanMaterial);
    headGroup.add(visor);

    // 3. Jetpack Thrusters (on back)
    const jetpackGeo = new THREE.BoxGeometry(0.5, 0.65, 0.22);
    const jetpack = new THREE.Mesh(jetpackGeo, armorMaterial);
    jetpack.position.set(0, 0, -0.32);
    this.torso.add(jetpack);

    // Thruster Flames
    const thrusterConeGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
    thrusterConeGeo.rotateX(Math.PI);
    this.thrusterLeft = new THREE.Mesh(thrusterConeGeo, neonMagentaMaterial);
    this.thrusterLeft.position.set(-0.16, -0.4, -0.32);
    this.torso.add(this.thrusterLeft);

    this.thrusterRight = new THREE.Mesh(thrusterConeGeo, neonMagentaMaterial);
    this.thrusterRight.position.set(0.16, -0.4, -0.32);
    this.torso.add(this.thrusterRight);

    // 4. Arms
    const limbGeo = new THREE.BoxGeometry(0.2, 0.65, 0.22);
    limbGeo.translate(0, -0.28, 0);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.5, 0.38, 0);
    const leftArmMesh = new THREE.Mesh(limbGeo, armorMaterial);
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.5, 0.38, 0);
    const rightArmMesh = new THREE.Mesh(limbGeo, armorMaterial);
    this.rightArm.add(rightArmMesh);
    this.torso.add(this.rightArm);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.26);
    legGeo.translate(0, -0.4, 0);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.24, 0.85, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, armorMaterial);
    this.leftLeg.add(leftLegMesh);
    this.mesh.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.24, 0.85, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, armorMaterial);
    this.rightLeg.add(rightLegMesh);
    this.mesh.add(this.rightLeg);

    // 6. Invulnerability Shield Bubble (Wireframe)
    const shieldGeo = new THREE.SphereGeometry(1.4, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.2;
    this.mesh.add(this.shieldMesh);

    // Initial positioning
    this.mesh.position.set(0, 0, 0);
  }

  moveToLane(lane) {
    if (lane < LANES.LEFT || lane > LANES.RIGHT) return;
    this.currentLane = lane;
    this.targetX = LANE_X_POSITIONS[lane];
  }

  shiftLane(direction) {
    // direction: -1 (left), +1 (right)
    const nextLane = this.currentLane + direction;
    if (nextLane >= LANES.LEFT && nextLane <= LANES.RIGHT) {
      this.moveToLane(nextLane);
      return true;
    }
    return false;
  }

  jump() {
    if (this.isJumping || this.isCrouching) return false;
    this.isJumping = true;
    this.velocityY = this.jumpStrength;
    return true;
  }

  crouch(isHolding = true) {
    if (this.isJumping) return false;
    this.isCrouching = isHolding;
    return true;
  }

  standUp() {
    this.isCrouching = false;
  }

  triggerHit() {
    this.isInvulnerable = true;
    this.invulnerableTimer = 1.6; // 1.6 seconds of immunity
  }

  update(dt, speedMultiplier = 1.0) {
    // 1. Smooth Lane Lerping (X position & bank tilt)
    const prevX = this.mesh.position.x;
    this.mesh.position.x += (this.targetX - this.mesh.position.x) * Math.min(1.0, dt * 14.0);
    const deltaX = this.mesh.position.x - prevX;

    // Tilting into turns
    this.mesh.rotation.z = -deltaX * 1.8;
    this.mesh.rotation.y = deltaX * 1.2;

    // 2. Vertical Jump Physics
    if (this.isJumping) {
      this.y += this.velocityY * dt;
      this.velocityY += this.gravity * dt;

      if (this.y <= 0) {
        this.y = 0;
        this.velocityY = 0;
        this.isJumping = false;
      }
      this.mesh.position.y = this.y;
    } else {
      this.mesh.position.y = 0;
    }

    // 3. Crouch Kinematics
    if (this.isCrouching && !this.isJumping) {
      // Duck down
      this.torso.position.y = THREE.MathUtils.lerp(this.torso.position.y, 0.7, dt * 20.0);
      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.7, dt * 20.0);
      this.leftLeg.position.y = 0.45;
      this.rightLeg.position.y = 0.45;
      this.leftLeg.rotation.x = -0.8;
      this.rightLeg.rotation.x = 0.8;
    } else {
      // Normal standing / running stance
      this.torso.position.y = THREE.MathUtils.lerp(this.torso.position.y, 1.35, dt * 15.0);
      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0.12, dt * 15.0);
    }

    // 4. Running Animation Loop
    if (!this.isJumping && !this.isCrouching) {
      this.runCycle += dt * this.runSpeed * speedMultiplier;
      const swing = Math.sin(this.runCycle);

      this.leftLeg.position.y = 0.85;
      this.rightLeg.position.y = 0.85;

      this.leftLeg.rotation.x = swing * 0.75;
      this.rightLeg.rotation.x = -swing * 0.75;

      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;

      // Slight head and torso vertical bobbing
      this.mesh.position.y = Math.abs(Math.sin(this.runCycle * 2)) * 0.1;
    } else if (this.isJumping) {
      // Tucked jump pose
      this.leftLeg.rotation.x = -0.6;
      this.rightLeg.rotation.x = -0.4;
      this.leftArm.rotation.x = -1.2;
      this.rightArm.rotation.x = -1.2;
    }

    // 5. Thruster Flame Scale Flicker
    const flameScale = (this.isJumping ? 2.0 : 1.0) + Math.random() * 0.3;
    this.thrusterLeft.scale.set(flameScale, flameScale, flameScale);
    this.thrusterRight.scale.set(flameScale, flameScale, flameScale);

    // 6. Invulnerability Flash / Shield
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      this.shieldMesh.material.opacity = (Math.sin(this.invulnerableTimer * 20) * 0.5 + 0.5) * 0.75;
      this.shieldMesh.rotation.y += dt * 4.0;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.shieldMesh.material.opacity = 0;
      }
    }

    // 7. Update Bounding Box for Collisions
    this.updateHitbox();
  }

  updateHitbox() {
    // Dynamic height based on crouch or jump
    const posX = this.mesh.position.x;
    const posY = this.mesh.position.y;
    const posZ = this.mesh.position.z;

    const halfW = 0.5;
    const halfD = 0.45;
    const height = this.isCrouching ? 0.9 : 2.0;

    this.box.min.set(posX - halfW, posY, posZ - halfD);
    this.box.max.set(posX + halfW, posY + height, posZ + halfD);
  }

  reset() {
    this.currentLane = LANES.CENTER;
    this.targetX = LANE_X_POSITIONS[LANES.CENTER];
    this.mesh.position.set(0, 0, 0);
    this.y = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isCrouching = false;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.shieldMesh.material.opacity = 0;
  }
}
