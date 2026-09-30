/* =========================================================
   POSE RUNNER - Obstacle Manager & Collision Logic
   ========================================================= */

import * as THREE from 'three';
import { LANES, LANE_X_POSITIONS, OBSTACLE_TYPES } from '../utils/constants.js';

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.spawnTimer = 0;

    // Shared reusable materials
    this.barrierMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3355,
      emissive: 0xff1133,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.3
    });

    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85
    });

    this.dangerLaserMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.95
    });

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x161a30,
      metalness: 0.9,
      roughness: 0.2
    });
  }

  spawnObstacle(levelConfig) {
    const types = levelConfig.allowedObstacles || [OBSTACLE_TYPES.LOW_BARRIER, OBSTACLE_TYPES.SIDE_OBSTACLE];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    const obstacle = new THREE.Group();
    obstacle.userData = {
      type: chosenType,
      cleared: false,
      passed: false,
      box: new THREE.Box3()
    };

    const spawnZ = -145;

    switch (chosenType) {
      case OBSTACLE_TYPES.LOW_BARRIER: {
        // Needs JUMP: Low barrier covering 1, 2, or 3 lanes
        const isFullWidth = Math.random() < 0.4;
        let lane = LANES.CENTER;
        if (!isFullWidth) {
          lane = [LANES.LEFT, LANES.CENTER, LANES.RIGHT][Math.floor(Math.random() * 3)];
        }

        const width = isFullWidth ? 9.8 : 2.8;
        const height = 0.95;
        const depth = 0.5;

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.barrierMaterial);
        mesh.position.y = height / 2;
        obstacle.add(mesh);

        // Warning Light Strips
        const lightGeo = new THREE.BoxGeometry(width * 0.95, 0.12, depth + 0.05);
        const lightMesh = new THREE.Mesh(lightGeo, this.dangerLaserMat);
        lightMesh.position.y = height * 0.75;
        obstacle.add(lightMesh);

        obstacle.position.set(isFullWidth ? 0 : LANE_X_POSITIONS[lane], 0, spawnZ);
        obstacle.userData.lane = isFullWidth ? null : lane;
        obstacle.userData.isFullWidth = isFullWidth;
        obstacle.userData.requires = 'JUMP';
        obstacle.userData.dimensions = { width, height, depth };
        break;
      }

      case OBSTACLE_TYPES.HIGH_LASER: {
        // Needs CROUCH: Floating laser beam at head height (Y = 1.2 to 2.4)
        const width = 9.8;
        const beamY = 1.6;

        // Side emitter towers
        const towerGeo = new THREE.BoxGeometry(0.5, 3.2, 0.5);
        const leftTower = new THREE.Mesh(towerGeo, this.frameMaterial);
        leftTower.position.set(-width / 2, 1.6, 0);
        obstacle.add(leftTower);

        const rightTower = new THREE.Mesh(towerGeo, this.frameMaterial);
        rightTower.position.set(width / 2, 1.6, 0);
        obstacle.add(rightTower);

        // Horizontal laser beams (danger area)
        const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, width, 12);
        beamGeo.rotateZ(Math.PI / 2);
        const beam1 = new THREE.Mesh(beamGeo, this.dangerLaserMat);
        beam1.position.set(0, beamY, 0);
        obstacle.add(beam1);

        const beam2 = new THREE.Mesh(beamGeo, this.dangerLaserMat);
        beam2.position.set(0, beamY + 0.5, 0);
        obstacle.add(beam2);

        obstacle.position.set(0, 0, spawnZ);
        obstacle.userData.requires = 'CROUCH';
        obstacle.userData.beamY = beamY;
        obstacle.userData.dimensions = { width, height: 1.2, depth: 0.6, minY: 1.1, maxY: 2.5 };
        break;
      }

      case OBSTACLE_TYPES.SIDE_OBSTACLE: {
        // Requires dodging sideways: Tall hazard pillar in Left or Right lane
        const lane = Math.random() < 0.5 ? LANES.LEFT : LANES.RIGHT;
        const width = 2.6;
        const height = 3.5;
        const depth = 1.2;

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.barrierMaterial);
        mesh.position.y = height / 2;
        obstacle.add(mesh);

        obstacle.position.set(LANE_X_POSITIONS[lane], 0, spawnZ);
        obstacle.userData.lane = lane;
        obstacle.userData.requires = 'DODGE';
        obstacle.userData.dimensions = { width, height, depth };
        break;
      }

      case OBSTACLE_TYPES.CENTER_HAZARD: {
        // Requires dodging to Left or Right: Drone hovering in center
        const width = 2.6;
        const height = 3.2;
        const depth = 1.4;

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.barrierMaterial);
        mesh.position.y = height / 2;
        obstacle.add(mesh);

        obstacle.position.set(LANE_X_POSITIONS[LANES.CENTER], 0, spawnZ);
        obstacle.userData.lane = LANES.CENTER;
        obstacle.userData.requires = 'DODGE';
        obstacle.userData.dimensions = { width, height, depth };
        break;
      }
    }

    this.scene.add(obstacle);
    this.obstacles.push(obstacle);
  }

  update(dt, speed, levelConfig, player, callbacks = {}) {
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= levelConfig.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle(levelConfig);
    }

    const scrollDelta = speed * dt;
    const playerZ = player.mesh.position.z;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.position.z += scrollDelta;

      // Update obstacle 3D bounding box
      const dim = obstacle.userData.dimensions;
      const ox = obstacle.position.x;
      const oy = obstacle.position.y;
      const oz = obstacle.position.z;

      if (obstacle.userData.requires === 'CROUCH') {
        obstacle.userData.box.min.set(ox - dim.width / 2, dim.minY, oz - dim.depth / 2);
        obstacle.userData.box.max.set(ox + dim.width / 2, dim.maxY, oz + dim.depth / 2);
      } else {
        obstacle.userData.box.min.set(ox - dim.width / 2, oy, oz - dim.depth / 2);
        obstacle.userData.box.max.set(ox + dim.width / 2, oy + dim.height, oz + dim.depth / 2);
      }

      // Check Collision with player
      if (!player.isInvulnerable && !obstacle.userData.cleared) {
        if (obstacle.userData.box.intersectsBox(player.box)) {
          // Check if player properly cleared it:
          let avoided = false;

          if (obstacle.userData.requires === 'JUMP') {
            // Did player jump high enough?
            if (player.isJumping && player.y > 0.8) {
              avoided = true;
            }
          } else if (obstacle.userData.requires === 'CROUCH') {
            // Did player crouch/duck down low?
            if (player.isCrouching) {
              avoided = true;
            }
          }

          if (!avoided) {
            obstacle.userData.cleared = true;
            if (callbacks.onCollision) {
              callbacks.onCollision(obstacle);
            }
          }
        }
      }

      // Check when obstacle is safely passed behind player
      if (!obstacle.userData.passed && obstacle.position.z > (playerZ + 2.0)) {
        obstacle.userData.passed = true;
        if (!obstacle.userData.cleared && callbacks.onAvoided) {
          callbacks.onAvoided(obstacle);
        }
      }

      // Recycle obstacle after passing far behind camera
      if (obstacle.position.z > 25) {
        this.scene.remove(obstacle);
        this.obstacles.splice(i, 1);
      }
    }
  }

  getUpcomingObstacle(playerZ = 0) {
    // Find closest obstacle ahead of player
    let closest = null;
    let minDistance = Infinity;

    for (const obs of this.obstacles) {
      const dist = (playerZ - obs.position.z);
      if (dist > 5 && dist < 45 && dist < minDistance) {
        minDistance = dist;
        closest = obs;
      }
    }
    return closest;
  }

  reset() {
    for (const obs of this.obstacles) {
      this.scene.remove(obs);
    }
    this.obstacles = [];
    this.spawnTimer = 0;
  }
}
