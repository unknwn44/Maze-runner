import * as THREE from 'three';

/**
 * Enemy AI — A "Griever" that chases the player through the maze.
 * Uses BFS-based pathfinding on the maze grid for navigation.
 */
export class Enemy {
  constructor(scene, mazeData, cellSize) {
    this.scene = scene;
    this.mazeData = mazeData;
    this.cellSize = cellSize;

    this.position = new THREE.Vector3();
    this.speed = 2.5;
    this.chaseRadius = 999; // always chases
    this.catchRadius = 1.2;

    this.path = [];
    this.pathIndex = 0;
    this.pathUpdateTimer = 0;
    this.pathUpdateInterval = 0.5; // seconds between path recalculations

    // Visual
    this.mesh = this._createMesh();
    this.scene.add(this.mesh);

    // Glow light
    this.light = new THREE.PointLight(0xff4422, 2, 8);
    this.light.position.set(0, 1, 0);
    this.mesh.add(this.light);

    // Animation
    this.time = 0;
  }

  _createMesh() {
    const group = new THREE.Group();

    // Body - dark organic shape
    const bodyGeo = new THREE.SphereGeometry(0.45, 8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0e,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x331100,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.scale.set(1, 0.8, 1.2);
    group.add(body);

    // Legs/tentacles
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1a0e05,
      roughness: 1.0,
      emissive: 0x220800,
      emissiveIntensity: 0.2,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const legGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 4);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(Math.cos(angle) * 0.35, 0.25, Math.sin(angle) * 0.35);
      leg.rotation.z = Math.cos(angle) * 0.4;
      leg.rotation.x = Math.sin(angle) * 0.4;
      group.add(leg);
    }

    // Eyes - glowing red
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff4400,
      emissiveIntensity: 2.0,
    });
    for (let i = -1; i <= 1; i += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(i * 0.15, 0.7, 0.35);
      group.add(eye);
    }

    return group;
  }

  setPosition(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.copy(this.position);
    this.path = [];
    this.pathIndex = 0;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  _bfs(startGX, startGY, endGX, endGY) {
    const { grid, gridWidth, gridHeight } = this.mazeData;

    // Clamp positions
    const sx = Math.max(0, Math.min(gridWidth - 1, startGX));
    const sy = Math.max(0, Math.min(gridHeight - 1, startGY));
    const ex = Math.max(0, Math.min(gridWidth - 1, endGX));
    const ey = Math.max(0, Math.min(gridHeight - 1, endGY));

    if (grid[sy][sx] === 1 || grid[ey][ex] === 1) return [];

    const visited = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(false));
    const parent = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null));
    const queue = [[sx, sy]];
    visited[sy][sx] = true;

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      if (cx === ex && cy === ey) {
        // Reconstruct path
        const path = [];
        let cur = [ex, ey];
        while (cur) {
          path.unshift(cur);
          cur = parent[cur[1]][cur[0]];
        }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight &&
            !visited[ny][nx] && grid[ny][nx] === 0) {
          visited[ny][nx] = true;
          parent[ny][nx] = [cx, cy];
          queue.push([nx, ny]);
        }
      }
    }
    return [];
  }

  update(dt, playerPosition) {
    this.time += dt;

    // Update path periodically
    this.pathUpdateTimer += dt;
    if (this.pathUpdateTimer >= this.pathUpdateInterval) {
      this.pathUpdateTimer = 0;

      const myGX = Math.floor(this.position.x / this.cellSize);
      const myGY = Math.floor(this.position.z / this.cellSize);
      const pGX = Math.floor(playerPosition.x / this.cellSize);
      const pGY = Math.floor(playerPosition.z / this.cellSize);

      this.path = this._bfs(myGX, myGY, pGX, pGY);
      this.pathIndex = 1; // Skip first (current) cell
    }

    // Follow path
    if (this.path.length > 0 && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const tx = (target[0] + 0.5) * this.cellSize;
      const tz = (target[1] + 0.5) * this.cellSize;

      const dx = tx - this.position.x;
      const dz = tz - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.2) {
        this.pathIndex++;
      } else {
        const moveX = (dx / dist) * this.speed * dt;
        const moveZ = (dz / dist) * this.speed * dt;
        this.position.x += moveX;
        this.position.z += moveZ;
      }
    }

    // Animation - bobbing and rotation
    this.mesh.position.set(
      this.position.x,
      0.1 + Math.sin(this.time * 3) * 0.1,
      this.position.z
    );
    this.mesh.rotation.y += dt * 0.5;

    // Pulsing light
    this.light.intensity = 2 + Math.sin(this.time * 5) * 0.8;
  }

  distanceToPlayer(playerPosition) {
    return Math.sqrt(
      (this.position.x - playerPosition.x) ** 2 +
      (this.position.z - playerPosition.z) ** 2
    );
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
