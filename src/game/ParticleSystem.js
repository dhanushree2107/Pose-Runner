/* =========================================================
   POSE RUNNER - Three.js Particle System (Speed, Sparks, Bursts)
   ========================================================= */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];

    this.initSpeedParticles();
  }

  initSpeedParticles() {
    this.speedCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.speedCount * 3);

    for (let i = 0; i < this.speedCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 35; // X
      positions[i * 3 + 1] = Math.random() * 12 + 0.5;   // Y
      positions[i * 3 + 2] = -Math.random() * 160 + 10;  // Z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.28,
      transparent: true,
      opacity: 0.65
    });

    this.speedParticles = new THREE.Points(geometry, material);
    this.scene.add(this.speedParticles);
  }

  createBurst(x, y, z, color = 0x00ff88, count = 24) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      velocities.push({
        x: (Math.random() - 0.5) * 12,
        y: Math.random() * 8 + 2,
        z: (Math.random() - 0.5) * 12
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.35,
      transparent: true,
      opacity: 1.0
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.bursts.push({
      mesh: pSystem,
      geo,
      mat,
      velocities,
      lifetime: 0.65,
      age: 0
    });
  }

  update(dt, currentSpeed) {
    // 1. Update Speed Particles
    const pos = this.speedParticles.geometry.attributes.position.array;
    const scrollDelta = currentSpeed * dt * 1.3;

    for (let i = 0; i < this.speedCount; i++) {
      pos[i * 3 + 2] += scrollDelta;
      if (pos[i * 3 + 2] > 20) {
        pos[i * 3 + 2] = -150 - Math.random() * 20;
        pos[i * 3 + 0] = (Math.random() - 0.5) * 35;
        pos[i * 3 + 1] = Math.random() * 12 + 0.5;
      }
    }
    this.speedParticles.geometry.attributes.position.needsUpdate = true;

    // 2. Update Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const progress = b.age / b.lifetime;

      if (progress >= 1.0) {
        this.scene.remove(b.mesh);
        b.geo.dispose();
        b.mat.dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      b.mat.opacity = 1.0 - progress;
      const pArr = b.geo.attributes.position.array;
      const vArr = b.velocities;

      for (let j = 0; j < vArr.length; j++) {
        pArr[j * 3 + 0] += vArr[j].x * dt;
        pArr[j * 3 + 1] += vArr[j].y * dt;
        pArr[j * 3 + 2] += vArr[j].z * dt;
        vArr[j].y -= 9.8 * dt; // Gravity
      }
      b.geo.attributes.position.needsUpdate = true;
    }
  }

  reset() {
    for (const b of this.bursts) {
      this.scene.remove(b.mesh);
      b.geo.dispose();
      b.mat.dispose();
    }
    this.bursts = [];
  }
}
