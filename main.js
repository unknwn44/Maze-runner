import * as THREE from 'three';
import { MazeGenerator } from './src/MazeGenerator.js';
import { MazeEnvironment } from './src/MazeEnvironment.js';
import { Player } from './src/Player.js';
import { Enemy } from './src/Enemy.js';
import { Minimap } from './src/Minimap.js';

/* ─────────── CONFIG ─────────── */
const CELL_SIZE = 2.5;
const WALL_HEIGHT = 4.0;
const BASE_MAZE_COLS = 6;
const BASE_MAZE_ROWS = 6;
const MAZE_GROWTH = 2; // Extra cols/rows per level
const BASE_ENEMY_SPEED = 2.2;
const ENEMY_SPEED_GROWTH = 0.4;

/* ─────────── STATE ─────────── */
let level = 1;
let timer = 0;
let isPlaying = false;
let gameOver = false;
let enemies = [];
let mazeData = null;
let animFrameId = null;
let lastTime = 0;

/* ─────────── DOM ─────────── */
const canvas = document.getElementById('gameCanvas');
const hud = document.getElementById('hud');
const minimap = document.getElementById('minimap');
const warningOverlay = document.getElementById('warningOverlay');
const startScreen = document.getElementById('startScreen');
const levelCompleteScreen = document.getElementById('levelCompleteScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const retryBtn = document.getElementById('retryBtn');
const timerDisplay = document.getElementById('timerDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const healthBarFill = document.getElementById('healthBarFill');

/* ─────────── THREE.JS SETUP ─────────── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1a0c);
scene.fog = new THREE.FogExp2(0x0e1a0c, 0.04);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 100);

/* ─────────── LIGHTING ─────────── */
// Ambient — warm forest under canopy
const ambient = new THREE.AmbientLight(0x2a3e1a, 0.7);
scene.add(ambient);

// Hemispherical (sky/ground) — warm moonlight from above, earthy tones below
const hemi = new THREE.HemisphereLight(0x3a4828, 0x1a2010, 0.5);
scene.add(hemi);

// Player flashlight (attached to camera)
const flashlight = new THREE.SpotLight(0xfff5e0, 2.0, 18, Math.PI / 4.5, 0.35, 1.2);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);
scene.add(camera);

/* ─────────── MODULES ─────────── */
const mazeEnv = new MazeEnvironment(scene);
let player = null;
const minimapRenderer = new Minimap('minimap');

/* ─────────── PARTICLE SYSTEM (FIREFLIES) ─────────── */
let fireflies = null;
let fireflyLights = [];
let fireflyBasePositions = null;

function createFireflies(gridWidth, gridHeight) {
  // Clean up old
  if (fireflies) {
    scene.remove(fireflies);
    fireflies.geometry.dispose();
    fireflies.material.dispose();
  }
  for (const fl of fireflyLights) scene.remove(fl);
  fireflyLights = [];

  const count = 120;
  const positions = new Float32Array(count * 3);
  fireflyBasePositions = new Float32Array(count * 3);
  const mazeW = gridWidth * CELL_SIZE;
  const mazeH = gridHeight * CELL_SIZE;

  for (let i = 0; i < count; i++) {
    const x = Math.random() * mazeW;
    const y = 0.4 + Math.random() * 2.8;
    const z = Math.random() * mazeH;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    fireflyBasePositions[i * 3] = x;
    fireflyBasePositions[i * 3 + 1] = y;
    fireflyBasePositions[i * 3 + 2] = z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xccff66,
    size: 0.15,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  fireflies = new THREE.Points(geo, mat);
  scene.add(fireflies);

  // Add a few point lights for natural glow (keep count LOW for performance)
  const lightCount = 4;
  for (let i = 0; i < lightCount; i++) {
    const idx = Math.floor(Math.random() * count);
    const light = new THREE.PointLight(0xbbee55, 0.6, 5);
    light.position.set(
      positions[idx * 3],
      positions[idx * 3 + 1],
      positions[idx * 3 + 2]
    );
    light._fireflyIdx = idx;
    scene.add(light);
    fireflyLights.push(light);
  }
}

function updateFireflies(time) {
  if (!fireflies || !fireflyBasePositions) return;
  const pos = fireflies.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // Organic drifting motion around base position
    pos.array[i * 3] = fireflyBasePositions[i * 3] + Math.sin(time * 1.2 + i * 0.7) * 0.3;
    pos.array[i * 3 + 1] = fireflyBasePositions[i * 3 + 1] + Math.sin(time * 1.8 + i * 1.3) * 0.2;
    pos.array[i * 3 + 2] = fireflyBasePositions[i * 3 + 2] + Math.cos(time * 1.0 + i * 1.1) * 0.3;
  }
  pos.needsUpdate = true;

  // Pulsing glow
  fireflies.material.opacity = 0.6 + Math.sin(time * 2.5) * 0.25;

  // Update light positions to follow their firefly
  for (const light of fireflyLights) {
    const idx = light._fireflyIdx;
    light.position.set(
      pos.array[idx * 3],
      pos.array[idx * 3 + 1],
      pos.array[idx * 3 + 2]
    );
    // Organic flickering intensity
    light.intensity = 0.6 + Math.sin(time * 3 + idx) * 0.4;
  }
}

/* ─────────── BIOLUMINESCENT GROUND LIGHTS ─────────── */
let bioLights = [];
function createBioLights(grid, gridWidth, gridHeight) {
  // Clean up old
  for (const b of bioLights) {
    scene.remove(b.mesh);
    b.mesh.geometry.dispose();
    b.mesh.material.dispose();
  }
  bioLights = [];

  // Scatter glowing mushroom/moss patches on open floor cells
  // Use ONLY emissive materials (no point lights) for performance
  const mushroomGeo = new THREE.SphereGeometry(0.15, 6, 4);
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (grid[y][x] === 0 && Math.random() < 0.05) {
        const hue = 0.25 + Math.random() * 0.12;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.35);
        const emissive = new THREE.Color().setHSL(hue, 0.9, 0.5);

        const mat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: emissive,
          emissiveIntensity: 2.5,
          roughness: 0.9,
        });
        const mesh = new THREE.Mesh(mushroomGeo, mat);
        const px = x * CELL_SIZE + CELL_SIZE * (0.2 + Math.random() * 0.6);
        const pz = y * CELL_SIZE + CELL_SIZE * (0.2 + Math.random() * 0.6);
        mesh.position.set(px, 0.1, pz);
        mesh.scale.set(0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.6, 0.6 + Math.random() * 0.8);
        scene.add(mesh);

        bioLights.push({ mesh, baseEmissive: 2.5 });
      }
    }
  }
}

function updateBioLights(time) {
  for (let i = 0; i < bioLights.length; i++) {
    const b = bioLights[i];
    // Gentle emissive pulsing (no point light cost)
    b.mesh.material.emissiveIntensity = b.baseEmissive + Math.sin(time * 1.5 + i * 2.1) * 0.5;
  }
}

/* ─────────── GAME FUNCTIONS ─────────── */

function getMazeSize() {
  return {
    cols: BASE_MAZE_COLS + (level - 1) * MAZE_GROWTH,
    rows: BASE_MAZE_ROWS + (level - 1) * MAZE_GROWTH,
  };
}

function getEnemyCount() {
  return Math.min(1 + Math.floor((level - 1) / 2), 5);
}

function buildLevel() {
  // Generate maze
  const { cols, rows } = getMazeSize();
  const gen = new MazeGenerator(cols, rows);
  mazeData = gen.generate();

  // Build environment
  mazeEnv.build(mazeData, CELL_SIZE, WALL_HEIGHT);

  // Setup player
  player = new Player(camera, mazeData, CELL_SIZE);
  player.setPosition(
    mazeData.startCell.x * CELL_SIZE + CELL_SIZE / 2,
    mazeData.startCell.y * CELL_SIZE + CELL_SIZE / 2
  );

  // Clear old enemies
  for (const e of enemies) e.dispose();
  enemies = [];

  // Spawn enemies at various positions in the maze
  const enemyCount = getEnemyCount();
  const openCells = [];
  for (let y = 0; y < mazeData.gridHeight; y++) {
    for (let x = 0; x < mazeData.gridWidth; x++) {
      if (mazeData.grid[y][x] === 0) {
        const distFromStart = Math.abs(x - mazeData.startCell.x) + Math.abs(y - mazeData.startCell.y);
        if (distFromStart > 8) {
          openCells.push({ x, y });
        }
      }
    }
  }

  // Shuffle and pick
  for (let i = openCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [openCells[i], openCells[j]] = [openCells[j], openCells[i]];
  }

  for (let i = 0; i < Math.min(enemyCount, openCells.length); i++) {
    const cell = openCells[i];
    const enemy = new Enemy(scene, mazeData, CELL_SIZE);
    enemy.setPosition(
      cell.x * CELL_SIZE + CELL_SIZE / 2,
      cell.y * CELL_SIZE + CELL_SIZE / 2
    );
    enemy.setSpeed(BASE_ENEMY_SPEED + (level - 1) * ENEMY_SPEED_GROWTH);
    enemies.push(enemy);
  }

  // Setup minimap
  minimapRenderer.setMaze(mazeData);

  // Fireflies
  createFireflies(mazeData.gridWidth, mazeData.gridHeight);

  // Bioluminescent ground lights
  createBioLights(mazeData.grid, mazeData.gridWidth, mazeData.gridHeight);

  // Update fog density based on level (slightly thicker = harder, but still visible)
  scene.fog.density = 0.035 + level * 0.004;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function showScreen(screen) {
  startScreen.classList.add('hidden');
  levelCompleteScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  screen.classList.remove('hidden');
}

function hideAllScreens() {
  startScreen.classList.add('hidden');
  levelCompleteScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
}

function startGame() {
  level = 1;
  timer = 0;
  gameOver = false;
  buildLevel();
  hideAllScreens();
  hud.classList.remove('hidden');
  minimap.classList.remove('hidden');

  // Request pointer lock
  canvas.requestPointerLock();
}

function nextLevel() {
  level++;
  timer = 0;
  gameOver = false;
  buildLevel();
  hideAllScreens();
  hud.classList.remove('hidden');
  minimap.classList.remove('hidden');
  canvas.requestPointerLock();
}

function triggerGameOver() {
  gameOver = true;
  isPlaying = false;
  player.unlock();
  document.exitPointerLock();

  document.getElementById('goTime').textContent = formatTime(timer);
  document.getElementById('goLevel').textContent = level;
  hud.classList.add('hidden');
  minimap.classList.add('hidden');
  warningOverlay.classList.add('hidden');
  showScreen(gameOverScreen);
}

function triggerLevelComplete() {
  isPlaying = false;
  player.unlock();
  document.exitPointerLock();

  document.getElementById('lcTime').textContent = formatTime(timer);
  document.getElementById('lcLevel').textContent = level;
  hud.classList.add('hidden');
  minimap.classList.add('hidden');
  warningOverlay.classList.add('hidden');
  showScreen(levelCompleteScreen);
}

/* ─────────── POINTER LOCK ─────────── */
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    isPlaying = true;
    if (player) player.lock();
  } else {
    isPlaying = false;
    if (player) player.unlock();
  }
});

/* ─────────── EVENT LISTENERS ─────────── */
startBtn.addEventListener('click', startGame);
nextLevelBtn.addEventListener('click', nextLevel);
retryBtn.addEventListener('click', () => {
  level = 1;
  startGame();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────── GAME LOOP ─────────── */
function gameLoop(time) {
  animFrameId = requestAnimationFrame(gameLoop);

  const now = time / 1000;
  const dt = Math.min(now - lastTime, 0.05); // Cap delta to prevent huge jumps
  lastTime = now;

  if (isPlaying && player && !gameOver) {
    // Update timer
    timer += dt;
    timerDisplay.textContent = formatTime(timer);
    levelDisplay.textContent = level;

    // Update player
    player.update(dt);

    // Update stamina bar
    healthBarFill.style.width = `${player.stamina}%`;

    // Update enemies
    let closestEnemyDist = Infinity;
    for (const enemy of enemies) {
      enemy.update(dt, player.position);
      const dist = enemy.distanceToPlayer(player.position);
      closestEnemyDist = Math.min(closestEnemyDist, dist);

      // Check catch
      if (dist < enemy.catchRadius) {
        triggerGameOver();
        return;
      }
    }

    // Warning overlay
    if (closestEnemyDist < 8) {
      warningOverlay.classList.remove('hidden');
      warningOverlay.style.opacity = Math.max(0.2, 1 - closestEnemyDist / 8);
    } else {
      warningOverlay.classList.add('hidden');
    }

    // Check win condition — player reached exit
    const { endCell } = mazeData;
    const pGridX = Math.floor(player.position.x / CELL_SIZE);
    const pGridZ = Math.floor(player.position.z / CELL_SIZE);
    if (pGridX === endCell.x && pGridZ === endCell.y) {
      triggerLevelComplete();
      return;
    }

    // Update minimap
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    minimapRenderer.draw(
      { x: player.position.x, z: player.position.z, dirX: forward.x, dirZ: forward.z },
      enemies.map(e => e.position),
      CELL_SIZE
    );

    // Update fireflies & bio lights
    updateFireflies(now);
    updateBioLights(now);
  }

  renderer.render(scene, camera);
}

// Start render loop immediately (shows start screen backdrop)
lastTime = performance.now() / 1000;
gameLoop(performance.now());
