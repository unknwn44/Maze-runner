import * as THREE from 'three';

/**
 * MazeEnvironment — Builds the 3D forest-themed maze from grid data.
 * Uses procedural textures for a realistic look.
 */
export class MazeEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.meshes = [];
    this.decorations = [];
  }

  _createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Stone/vine wall base
    ctx.fillStyle = '#3a3a2a';
    ctx.fillRect(0, 0, 256, 256);

    // Stone blocks
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 4; x++) {
        const offsetX = (y % 2) * 32;
        const bx = x * 64 + offsetX;
        const by = y * 32;
        const shade = 40 + Math.random() * 30;
        ctx.fillStyle = `rgb(${shade + 10}, ${shade + 8}, ${shade - 5})`;
        ctx.fillRect(bx + 1, by + 1, 62, 30);

        // Texture noise
        for (let i = 0; i < 20; i++) {
          const nx = bx + Math.random() * 62;
          const ny = by + Math.random() * 30;
          const ns = Math.random() * 15 + 35;
          ctx.fillStyle = `rgba(${ns + 10}, ${ns + 5}, ${ns - 10}, 0.3)`;
          ctx.fillRect(nx, ny, 3, 2);
        }
      }
    }

    // Moss and vine patches
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 15 + 5;
      ctx.fillStyle = `rgba(${40 + Math.random() * 30}, ${70 + Math.random() * 40}, ${20 + Math.random() * 20}, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vine lines
    ctx.strokeStyle = 'rgba(50, 90, 30, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = 0;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (Math.random() - 0.5) * 30;
        y += 32;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  _createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Dirt/grass base
    ctx.fillStyle = '#2e3520';
    ctx.fillRect(0, 0, 256, 256);

    // Dirt patches
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = 30 + Math.random() * 35;
      ctx.fillStyle = `rgba(${shade + 15}, ${shade + 10}, ${shade - 10}, 0.5)`;
      ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }

    // Grass tufts
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = `rgba(${40 + Math.random() * 30}, ${60 + Math.random() * 40}, ${20 + Math.random() * 15}, 0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 6 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small stones
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 4 + 1;
      ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${75 + Math.random() * 35}, ${60 + Math.random() * 30}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  _createCeilingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark canopy
    ctx.fillStyle = '#0e1408';
    ctx.fillRect(0, 0, 128, 128);

    // Dense leaf coverage
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const r = Math.random() * 10 + 3;
      ctx.fillStyle = `rgba(${15 + Math.random() * 20}, ${25 + Math.random() * 25}, ${8 + Math.random() * 12}, ${0.5 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  build(mazeData, cellSize, wallHeight) {
    this.clear();

    const { grid, gridWidth, gridHeight, endCell } = mazeData;
    const wallTexture = this._createWallTexture();
    const floorTexture = this._createFloorTexture();
    const ceilingTexture = this._createCeilingTexture();

    floorTexture.repeat.set(gridWidth / 4, gridHeight / 4);
    ceilingTexture.repeat.set(gridWidth / 4, gridHeight / 4);

    // Materials
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.95,
      metalness: 0.0,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTexture,
      roughness: 1.0,
      metalness: 0.0,
    });

    // Use instanced geometry for efficiency
    const wallGeo = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
    const wallCount = grid.flat().filter(c => c === 1).length;
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] === 1) {
          dummy.position.set(
            x * cellSize + cellSize / 2,
            wallHeight / 2,
            y * cellSize + cellSize / 2
          );
          dummy.updateMatrix();
          wallMesh.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }
    wallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(wallMesh);
    this.meshes.push(wallMesh);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(gridWidth * cellSize, gridHeight * cellSize);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(gridWidth * cellSize / 2, 0, gridHeight * cellSize / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.meshes.push(floor);

    // Ceiling (sparse canopy)
    const ceilGeo = new THREE.PlaneGeometry(gridWidth * cellSize, gridHeight * cellSize);
    const ceiling = new THREE.Mesh(ceilGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(gridWidth * cellSize / 2, wallHeight + 0.5, gridHeight * cellSize / 2);
    ceiling.material.transparent = true;
    ceiling.material.opacity = 0.6;
    this.scene.add(ceiling);
    this.meshes.push(ceiling);

    // Exit marker — glowing green beacon
    this._createExitMarker(endCell, cellSize, wallHeight);

    // Add scattered decorations
    this._addDecorations(grid, gridWidth, gridHeight, cellSize);
  }

  _createExitMarker(endCell, cellSize, wallHeight) {
    // Ground glow
    const glowGeo = new THREE.PlaneGeometry(cellSize * 0.8, cellSize * 0.8);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      emissive: 0x22ff22,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(
      endCell.x * cellSize + cellSize / 2,
      0.05,
      endCell.y * cellSize + cellSize / 2
    );
    this.scene.add(glow);
    this.meshes.push(glow);

    // Beacon light
    const beacon = new THREE.PointLight(0x44ff44, 3, cellSize * 5);
    beacon.position.set(
      endCell.x * cellSize + cellSize / 2,
      wallHeight / 2,
      endCell.y * cellSize + cellSize / 2
    );
    this.scene.add(beacon);
    this.meshes.push(beacon);

    // Vertical light pillar
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      emissive: 0x22ff22,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.3,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(
      endCell.x * cellSize + cellSize / 2,
      wallHeight / 2,
      endCell.y * cellSize + cellSize / 2
    );
    this.scene.add(pillar);
    this.meshes.push(pillar);
  }

  _addDecorations(grid, gridWidth, gridHeight, cellSize) {
    // Add small ground plants in open areas
    const plantGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
    const plantMat = new THREE.MeshStandardMaterial({
      color: 0x2a5a1a,
      roughness: 1.0,
    });

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] === 0 && Math.random() < 0.08) {
          const plant = new THREE.Mesh(plantGeo, plantMat);
          plant.position.set(
            x * cellSize + cellSize * (0.2 + Math.random() * 0.6),
            0.2,
            y * cellSize + cellSize * (0.2 + Math.random() * 0.6)
          );
          plant.scale.set(
            0.5 + Math.random() * 0.5,
            0.5 + Math.random() * 1.0,
            0.5 + Math.random() * 0.5
          );
          plant.rotation.y = Math.random() * Math.PI * 2;
          this.scene.add(plant);
          this.decorations.push(plant);
        }
      }
    }

    // Add vine-like structures on walls
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a0a,
      roughness: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        if (grid[y][x] === 1 && Math.random() < 0.12) {
          // Check if adjacent to a path
          const hasPath = [grid[y-1]?.[x], grid[y+1]?.[x], grid[y]?.[x-1], grid[y]?.[x+1]].includes(0);
          if (hasPath) {
            const vineGeo = new THREE.BoxGeometry(0.05, 1.5 + Math.random() * 1.5, 0.05);
            const vine = new THREE.Mesh(vineGeo, vineMat);
            vine.position.set(
              x * cellSize + cellSize * (0.3 + Math.random() * 0.4),
              1.5,
              y * cellSize + cellSize * (0.3 + Math.random() * 0.4)
            );
            vine.rotation.z = (Math.random() - 0.5) * 0.2;
            this.scene.add(vine);
            this.decorations.push(vine);
          }
        }
      }
    }
  }

  clear() {
    for (const m of this.meshes) {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      }
    }
    for (const d of this.decorations) {
      this.scene.remove(d);
      if (d.geometry) d.geometry.dispose();
      if (d.material) d.material.dispose();
    }
    this.meshes = [];
    this.decorations = [];
  }
}
