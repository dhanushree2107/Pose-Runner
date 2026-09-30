/* =========================================================
   POSE RUNNER - Endless 3D Cyber Track & Environment
   ========================================================= */

import * as THREE from 'three';

export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.trackSegments = [];
    this.segmentLength = 60;
    this.totalSegments = 5;
    this.trackWidth = 11.0;

    // Environmental elements
    this.cityBuildings = [];
    this.cyberArches = [];

    this.initTrack();
    this.initEnvironment();
  }

  initTrack() {
    // Road Tile Materials
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x070914,
      metalness: 0.85,
      roughness: 0.35
    });

    const laneDividerMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85
    });

    const borderGlowMat = new THREE.MeshBasicMaterial({
      color: 0xb026ff,
      transparent: true,
      opacity: 0.95
    });

    // Create recycling road segments
    for (let i = 0; i < this.totalSegments; i++) {
      const segment = new THREE.Group();
      segment.position.z = -i * this.segmentLength + 20;

      // 1. Road Floor
      const roadGeo = new THREE.PlaneGeometry(this.trackWidth, this.segmentLength);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
      roadMesh.receiveShadow = true;
      segment.add(roadMesh);

      // 2. Glowing Lane Dividers (Between -1, 0, +1 lanes)
      const lineGeo = new THREE.BoxGeometry(0.12, 0.02, this.segmentLength);
      // Left divider at X = -1.6
      const leftLine = new THREE.Mesh(lineGeo, laneDividerMat);
      leftLine.position.set(-1.6, 0.01, 0);
      segment.add(leftLine);

      // Right divider at X = +1.6
      const rightLine = new THREE.Mesh(lineGeo, laneDividerMat);
      rightLine.position.set(1.6, 0.01, 0);
      segment.add(rightLine);

      // 3. Glowing Outer Borders
      const borderGeo = new THREE.BoxGeometry(0.3, 0.25, this.segmentLength);
      const leftBorder = new THREE.Mesh(borderGeo, borderGlowMat);
      leftBorder.position.set(-this.trackWidth / 2, 0.12, 0);
      segment.add(leftBorder);

      const rightBorder = new THREE.Mesh(borderGeo, borderGlowMat);
      rightBorder.position.set(this.trackWidth / 2, 0.12, 0);
      segment.add(rightBorder);

      // 4. Overhead Cyber Arch on every second segment
      if (i % 2 === 0) {
        const arch = this.createCyberArch();
        arch.position.set(0, 0, 0);
        segment.add(arch);
      }

      this.scene.add(segment);
      this.trackSegments.push(segment);
    }
  }

  createCyberArch() {
    const archGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x12172d,
      metalness: 0.9,
      roughness: 0.2
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    // Arch Pillars
    const pillarGeo = new THREE.BoxGeometry(0.6, 6.0, 0.6);
    const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
    leftPillar.position.set(-this.trackWidth / 2 - 0.4, 3.0, 0);
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
    rightPillar.position.set(this.trackWidth / 2 + 0.4, 3.0, 0);
    archGroup.add(rightPillar);

    // Arch Crossbar
    const crossGeo = new THREE.BoxGeometry(this.trackWidth + 1.6, 0.6, 0.6);
    const crossbar = new THREE.Mesh(crossGeo, frameMat);
    crossbar.position.set(0, 6.0, 0);
    archGroup.add(crossbar);

    // Neon Accent Trim
    const trimGeo = new THREE.BoxGeometry(this.trackWidth + 1.2, 0.1, 0.7);
    const trim = new THREE.Mesh(trimGeo, neonMat);
    trim.position.set(0, 5.7, 0);
    archGroup.add(trim);

    return archGroup;
  }

  initEnvironment() {
    // City Skyline Buildings (left and right of track)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x060814,
      metalness: 0.9,
      roughness: 0.4
    });

    const windowMat = new THREE.MeshBasicMaterial({
      color: 0x1f2e60,
      wireframe: true
    });

    for (let i = 0; i < 28; i++) {
      const height = 15 + Math.random() * 45;
      const width = 8 + Math.random() * 12;
      const depth = 8 + Math.random() * 12;
      const geo = new THREE.BoxGeometry(width, height, depth);

      const building = new THREE.Mesh(geo, buildingMat);
      const wireframe = new THREE.Mesh(geo, windowMat);
      building.add(wireframe);

      // Place randomly on sides
      const side = (i % 2 === 0) ? -1 : 1;
      const x = side * (14 + Math.random() * 30);
      const z = -Math.random() * 260 + 30;

      building.position.set(x, height / 2 - 2, z);
      this.scene.add(building);
      this.cityBuildings.push(building);
    }
  }

  update(dt, currentSpeed) {
    const scrollDelta = currentSpeed * dt;

    // Scroll track segments towards camera
    for (const segment of this.trackSegments) {
      segment.position.z += scrollDelta;

      // Recycle segment when it passes camera
      if (segment.position.z > 30) {
        // Find furthest segment
        let furthestZ = 0;
        for (const s of this.trackSegments) {
          if (s.position.z < furthestZ) {
            furthestZ = s.position.z;
          }
        }
        segment.position.z = furthestZ - this.segmentLength;
      }
    }

    // Scroll city buildings with subtle parallax
    for (const b of this.cityBuildings) {
      b.position.z += scrollDelta * 0.75;
      if (b.position.z > 40) {
        b.position.z -= 280;
      }
    }
  }

  reset() {
    for (let i = 0; i < this.totalSegments; i++) {
      this.trackSegments[i].position.z = -i * this.segmentLength + 20;
    }
  }
}
