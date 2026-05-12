/**
 * Maze Generator — Recursive Backtracker Algorithm
 * Generates a maze grid where 1 = wall, 0 = path
 */

export class MazeGenerator {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
  }

  generate() {
    const cols = this.cols;
    const rows = this.rows;

    // Initialize grid: all walls
    const grid = [];
    for (let y = 0; y < rows * 2 + 1; y++) {
      grid[y] = [];
      for (let x = 0; x < cols * 2 + 1; x++) {
        grid[y][x] = 1;
      }
    }

    // Carve cells and walls using recursive backtracker
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const stack = [];

    const startR = 0;
    const startC = 0;
    visited[startR][startC] = true;
    grid[startR * 2 + 1][startC * 2 + 1] = 0;
    stack.push([startR, startC]);

    const directions = [
      [0, 1],   // right
      [0, -1],  // left
      [1, 0],   // down
      [-1, 0],  // up
    ];

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];

      // Find unvisited neighbors
      const neighbors = [];
      for (const [dr, dc] of directions) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          neighbors.push([nr, nc, dr, dc]);
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      // Pick random neighbor
      const [nr, nc, dr, dc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[nr][nc] = true;

      // Carve the wall between current and neighbor
      const wallY = cr * 2 + 1 + dr;
      const wallX = cc * 2 + 1 + dc;
      grid[wallY][wallX] = 0;

      // Carve the neighbor cell
      grid[nr * 2 + 1][nc * 2 + 1] = 0;

      stack.push([nr, nc]);
    }

    // Ensure start and end are open
    // Start: top-left area
    grid[1][1] = 0;
    grid[1][2] = 0;
    grid[2][1] = 0;

    // End: bottom-right area
    const endY = rows * 2 - 1;
    const endX = cols * 2 - 1;
    grid[endY][endX] = 0;
    grid[endY - 1][endX] = 0;
    grid[endY][endX - 1] = 0;

    return {
      grid,
      gridWidth: cols * 2 + 1,
      gridHeight: rows * 2 + 1,
      startCell: { x: 1, y: 1 },
      endCell: { x: endX, y: endY },
    };
  }
}
