/**
 * Minimap — Draws a top-down view of the maze with player and enemy positions.
 */
export class Minimap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.mazeData = null;
    this.cellSize = 1;
  }

  setMaze(mazeData) {
    this.mazeData = mazeData;
  }

  draw(playerPos, enemyPositions, cellSize) {
    if (!this.mazeData) return;

    const { grid, gridWidth, gridHeight, endCell } = this.mazeData;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const ctx = this.ctx;
    const scale = Math.min(cw / gridWidth, ch / gridHeight);

    ctx.clearRect(0, 0, cw, ch);

    // Draw maze
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] === 1) {
          ctx.fillStyle = 'rgba(60, 80, 40, 0.8)';
        } else {
          ctx.fillStyle = 'rgba(20, 28, 15, 0.6)';
        }
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    // Draw exit
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(endCell.x * scale, endCell.y * scale, scale, scale);

    // Draw enemies
    ctx.fillStyle = '#ff4422';
    for (const ePos of enemyPositions) {
      const ex = (ePos.x / cellSize) * scale;
      const ey = (ePos.z / cellSize) * scale;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    ctx.fillStyle = '#88ccff';
    const px = (playerPos.x / cellSize) * scale;
    const py = (playerPos.z / cellSize) * scale;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + playerPos.dirX * 8, py + playerPos.dirZ * 8);
    ctx.stroke();
  }
}
