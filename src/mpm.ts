import { Vector2 } from "@babylonjs/core";

const num_grid = 64;
const num_cells = num_grid * num_grid;

const frameDt = 1.0;
const dt = frameDt / 10;
const gravity = [0, -0.05];

class Particle {
  x: Vector2;
  v: Vector2;
  mass: number;

  constructor(pos: Vector2, vel: Vector2, mass: number) {
    this.x = pos;
    this.v = vel;
    this.mass = mass;
  }
}

class Cell {
  v: Vector2;
  mass: number;

  constructor(v: Vector2, mass: number) {
    this.v = v;
    this.mass = mass;
  }
}

export class MPM {
  particles: Particle[] = [];
  cells: Cell[] = [];
  num_particles: number = 0;

  constructor() {
    // initialising a bunch of points in a square
    const temp_positions: Vector2[] = [];
    const spacing = 1.0;
    const box_x = 16, box_y = 16;
    const sx = num_grid / 2.0, sy = num_grid / 2.0;
    
    for (let i = sx - box_x / 2; i < sx + box_x / 2; i += spacing) {
      for (let j = sy - box_y / 2; j < sy + box_y / 2; j += spacing) {
        const pos = new Vector2(i, j);
        temp_positions.push(pos);
      }
    }
    
    this.num_particles = temp_positions.length;

    // populate our array of particles, set their initial state
    for (let i = 0; i < this.num_particles; ++i) {
      const vel = new Vector2(
        (Math.random() - 0.5) * 0.5, 
        (Math.random() - 0.5 + 2.75) * 0.5
      );
      const p = new Particle(temp_positions[i], vel, 1.0);
      this.particles.push(p);
    }

    for (let i = 0; i < num_cells; i++) {
      this.cells.push(new Cell(Vector2.Zero(), 0));
    }
  }

  resetGrid() {
    for (let i = 0; i < num_cells; i++) {
      this.cells[i].v = Vector2.Zero();
      this.cells[i].mass = 0;
    }
  }

  particleToGrid() {
    for (let i = 0; i < this.num_particles; i++) {
      const p = this.particles[i];

      const base_x = Math.floor(p.x.x);
      const base_y = Math.floor(p.x.y);

      const dx = p.x.x - base_x - 0.5;
      const dy = p.x.y - base_y - 0.5;

      // Quadratic B-spline weights
      const weight = (x: number) => [
        0.5 * (0.5 - x) ** 2,
        0.75 - x ** 2,
        0.5 * (0.5 + x) ** 2
      ];

      const wx = weight(dx);
      const wy = weight(dy);

      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const w = wx[gx] * wy[gy];

          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;

          // Boundary check
          if (cell_x < 0 || cell_x >= num_grid || cell_y < 0 || cell_y >= num_grid) {
            continue;
          }

          const cell_index = cell_x * num_grid + cell_y;

          const mass = w * p.mass;

          // Affine term Q = C * dist
          this.cells[cell_index].mass += mass;
          this.cells[cell_index].v.x += mass * p.v.x; // momentum
          this.cells[cell_index].v.y += mass * p.v.y;
        }
      }
    }
  }

  updateGrid() {
    for (let i = 0; i < num_cells; i++) {
      const cell = this.cells[i];
      if (cell.mass === 0) continue;  

        cell.v.x /= cell.mass; // velocity
        cell.v.y /= cell.mass;
  
        cell.v.x += gravity[0] * dt;
        cell.v.y += gravity[1] * dt;
  
        // Boundary conditions: hard wall (zero velocity)
        const x = Math.floor(i / num_grid);
        const y = i % num_grid;
  
        if (x < 2 || x > num_grid - 3) {
          cell.v.x = 0;
        }
        if (y < 2 || y > num_grid - 3) {
          cell.v.y = 0;
        }
    }
  }

  gridToParticle() {
    for (let i = 0; i < this.num_particles; i++) {
      const p = this.particles[i];
  
      const base_x = Math.floor(p.x.x);
      const base_y = Math.floor(p.x.y);
  
      const dx = p.x.x - base_x - 0.5;
      const dy = p.x.y - base_y - 0.5;
  
      const weight = (x: number) => [
        0.5 * (0.5 - x) ** 2,
        0.75 - x ** 2,
        0.5 * (0.5 + x) ** 2
      ];
  
      const wx = weight(dx);
      const wy = weight(dy);
  
      let vx = 0, vy = 0;
  
      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const w = wx[gx] * wy[gy];
  
          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;
  
          if (cell_x < 0 || cell_x >= num_grid || cell_y < 0 || cell_y >= num_grid) continue;
  
          const cell_index = cell_x * num_grid + cell_y;
          const cell = this.cells[cell_index];
  
          const weighted_vx = cell.v.x * w;
          const weighted_vy = cell.v.y * w;
  
          vx += weighted_vx;
          vy += weighted_vy;
  
        }
      }
  
      // Store updated velocity
      p.v.x = vx;
      p.v.y = vy;
  
      // Advect particle
      p.x.x += p.v.x * dt;
      p.x.y += p.v.y * dt;
  
      // Clamp to simulation domain
      p.x.x = Math.min(Math.max(p.x.x, 1), num_grid - 2);
      p.x.y = Math.min(Math.max(p.x.y, 1), num_grid - 2);
    }
  }
  

  step() {
    this.resetGrid();
    this.particleToGrid();
    this.updateGrid();
    this.gridToParticle();
  }  
}
 