/* =========================================================
   POSE RUNNER - Collectible Energy Orbs & Powerups
   ========================================================= */

import * as THREE from 'three';
import { LANES, LANE_X_POSITIONS } from '../utils/constants.js';

export class CollectiblesManager {
  constructor(scene) {
    this.scene = scene;
    this.collectibles = [];
    this.spawnTimer = 0;

    // Glowing Octahedron Crystal Material
    this.orbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffa000,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.1
    });

    this.orbGeo = new THREE.OctahedronGeometry(0.38, 0);
  }

  spawnGroup() {
    const lane = [LANES.LEFT, LANES.CENTER, LANES.RIGHT][Math.floor(Math.random() * 3)];
    const isAirborne = Math.random() < 0.35; // 35% chance in mid-air (requires jumping!)
    const startZ = -140;
    const count = 3;

    for (let i = 0; i < count; i++) {
      const orb = new THREE.Mesh(this.orbGeo, this.orbMaterial);
      const y = isAirborne ? 2.4 : 1.2;
      orb.position.set(LANE_X_POSITIONS[lane], y, startZ - i * 4.5);
      orb.userData = {
        box: new THREE.Box3(),
        isAirborne
      };

      this.scene.add(orb);
      this.collectibles.push(orb);
    }
  }

  update(dt, speed, player, callbacks = {}) {
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= 2200) {
      this.spawnTimer = 0;
      this.spawnGroup();
    }

    const scrollDelta = speed * dt;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const orb = this.collectibles[i];
      orb.position.z += scrollDelta;
      orb.rotation.y += dt * 3.5;
      orb.rotation.x += dt * 1.5;

      // Update bounding box
      orb.userData.box.setFromObject(orb);

      // Check pickup by player
      if (orb.userData.box.intersectsBox(player.box)) {
        if (callbacks.onCollect) {
          callbacks.onCollect(orb);
        }
        this.scene.remove(orb);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Despawn behind camera
      if (orb.position.z > 20) {
        this.scene.remove(orb);
        this.collectibles.splice(i, 1);
      }
    }
  }

  reset() {
    for (const orb of this.collectibles) {
      this.scene.remove(orb);
    }
    this.collectibles = [];
    this.spawnTimer = 0;
  }
}
