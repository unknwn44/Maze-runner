import * as THREE from 'three';

/**
 * Player — FPS controller with WASD movement, jump, sprint, and collision detection.
 * Uses PointerLockControls-like behavior manually for more control.
 */
export class Player {
  constructor(camera, mazeData, cellSize) {
    this.camera = camera;
    this.mazeData = mazeData;
    this.cellSize = cellSize;

    // Physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.height = 1.7;
    this.radius = 0.35;

    // Movement
    this.moveSpeed = 5.0;
    this.sprintSpeed = 8.5;
    this.jumpForce = 7.0;
    this.gravity = -20.0;
    this.onGround = true;

    // Stamina
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaDrain = 20; // per second while sprinting
    this.staminaRegen = 12; // per second while not sprinting

    // Input
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };

    // Mouse look
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.mouseSensitivity = 0.002;
    this.isLocked = false;

    // Head bob
    this.bobTime = 0;
    this.bobAmount = 0.04;
    this.bobSpeed = 10;

    this._setupInput();
  }

  setPosition(x, z) {
    this.position.set(x, this.height, z);
    this.camera.position.copy(this.position);
    this.velocity.set(0, 0, 0);
  }

  _setupInput() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = true;
      if (key === ' ') this.keys.space = true;
    });
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in this.keys) this.keys[key] = false;
      if (key === ' ') this.keys.space = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * this.mouseSensitivity;
      this.euler.x -= e.movementY * this.mouseSensitivity;
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  lock() { this.isLocked = true; }
  unlock() { this.isLocked = false; }

  _checkCollision(newX, newZ) {
    const { grid, gridWidth, gridHeight } = this.mazeData;
    const cs = this.cellSize;
    const r = this.radius;

    // Check corners of player bounding box
    const checkPoints = [
      [newX - r, newZ - r],
      [newX + r, newZ - r],
      [newX - r, newZ + r],
      [newX + r, newZ + r],
    ];

    for (const [px, pz] of checkPoints) {
      const gx = Math.floor(px / cs);
      const gz = Math.floor(pz / cs);
      if (gx < 0 || gx >= gridWidth || gz < 0 || gz >= gridHeight) return true;
      if (grid[gz][gx] === 1) return true;
    }
    return false;
  }

  update(dt) {
    if (!this.isLocked) return;

    const isSprinting = this.keys.shift && this.stamina > 0;
    const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;

    // Stamina
    if (isSprinting && (this.keys.w || this.keys.a || this.keys.s || this.keys.d)) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrain * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
    }

    // Direction from camera orientation
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Input
    this.direction.set(0, 0, 0);
    if (this.keys.w) this.direction.add(forward);
    if (this.keys.s) this.direction.sub(forward);
    if (this.keys.d) this.direction.add(right);
    if (this.keys.a) this.direction.sub(right);
    if (this.direction.length() > 0) this.direction.normalize();

    // Horizontal velocity
    const hVelX = this.direction.x * speed;
    const hVelZ = this.direction.z * speed;

    // Apply gravity
    if (!this.onGround) {
      this.velocity.y += this.gravity * dt;
    }

    // Jump
    if (this.keys.space && this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }

    // Move with collision (slide along walls)
    const newX = this.position.x + hVelX * dt;
    const newZ = this.position.z + hVelZ * dt;

    if (!this._checkCollision(newX, this.position.z)) {
      this.position.x = newX;
    }
    if (!this._checkCollision(this.position.x, newZ)) {
      this.position.z = newZ;
    }

    // Vertical
    this.position.y += this.velocity.y * dt;
    if (this.position.y <= this.height) {
      this.position.y = this.height;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Head bob
    const isMoving = this.direction.length() > 0 && this.onGround;
    if (isMoving) {
      this.bobTime += dt * this.bobSpeed * (isSprinting ? 1.4 : 1.0);
      const bobOffset = Math.sin(this.bobTime) * this.bobAmount;
      this.camera.position.set(this.position.x, this.position.y + bobOffset, this.position.z);
    } else {
      this.bobTime = 0;
      this.camera.position.copy(this.position);
    }
  }

  getGridPosition() {
    return {
      x: Math.floor(this.position.x / this.cellSize),
      y: Math.floor(this.position.z / this.cellSize),
    };
  }
}
