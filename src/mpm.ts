import { Vector2 } from "@babylonjs/core";

const num_grid = 64;
const num_cells = num_grid * num_grid;
const grid_width = 1.0 / num_grid;

const dt = 1.0;
const iterations = Math.floor(1.0 / dt);

const gravity = -0.05;

class Particle {
  x: Vector2;
  v: Vector2;
  mass: number;

  constructor(pos: Vector2, mass: number) {
    this.x = pos;
    this.v = Vector2.Zero();
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
      const p = new Particle(temp_positions[i], 1.0);
      // random initial velocity
      p.v = new Vector2(
        (Math.random() - 0.5) * 0.5, 
        (Math.random() - 0.5 + 2.75) * 0.5
      );
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

      // Discrete base cell index (bottom-left corner)
      const base_x = Math.floor(p.x.x);
      const base_y = Math.floor(p.x.y);

      // Offset from base cell center
      const diff_x = p.x.x - base_x - 0.5;
      const diff_y = p.x.y - base_y - 0.5;

      // Quadratic B-spline weights
      const weight = (x: number) => [
        0.5 * (0.5 - x) ** 2,
        0.75 - x ** 2,
        0.5 * (0.5 + x) ** 2
      ];

      const [wx0, wx1, wx2] = weight(diff_x);
      const [wy0, wy1, wy2] = weight(diff_y);

      const weights_x = [wx0, wx1, wx2];
      const weights_y = [wy0, wy1, wy2];

      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const weight = weights_x[gx] * weights_y[gy];

          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;

          // Boundary check
          if (cell_x < 0 || cell_x >= num_grid || cell_y < 0 || cell_y >= num_grid) {
            continue;
          }

          const cell_index = cell_x * num_grid + cell_y;

          const mass_contrib = weight * p.mass;

          // Affine term Q = C * dist
          this.cells[cell_index].mass += mass_contrib;
          this.cells[cell_index].v.x += mass_contrib * p.v.x;
          this.cells[cell_index].v.y += mass_contrib * p.v.y;
        }
      }
    }
  }


  updateGrid() {
    for (let i = 0; i < num_cells; i++) {
      if (this.cells[i].mass === 0) continue;
      this.cells[i].v.scaleInPlace(1.0 / this.cells[i].mass);
      this.cells[i].v.addInPlace(new Vector2(0, gravity * dt));
      // Apply boundary conditions
      const cell_x = Math.floor(i / num_grid);
      const cell_y = i % num_grid;
      if (cell_x < 3 || cell_x >= num_grid - 3 || cell_y < 3 || cell_y >= num_grid - 3) {
        // Reflective boundary condition
        if (cell_x < 3 || cell_x >= num_grid - 3) {
          this.cells[i].v.x *= -1;
        }
        if (cell_y < 3 || cell_y >= num_grid - 3) {
          this.cells[i].v.y *= -1;
        }
      }
    }
  }

  gridToParticle() {
    // Placeholder for the grid to particle transfer function
  }

  step() {
    this.resetGrid();
    this.particleToGrid();
    this.updateGrid();
    this.gridToParticle();
  }  
}
 