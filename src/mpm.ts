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
      const cell_idx = new Vector2(Math.floor(p.x.x * num_grid), Math.floor(p.x.y * num_grid));
      const cell_diff = p.x.subtract(cell_idx).subtract(new Vector2(0.5, 0.5));

      if (cell_idx.x < 0 || cell_idx.x >= num_grid || cell_idx.y < 0 || cell_idx.y >= num_grid) continue;

      const index = cell_idx.y * num_grid + cell_idx.x;
      const cell = this.cells[index];

      cell.v.addInPlace(p.v.scale(p.mass));
      cell.mass += p.mass;
    }
  }

  updateGrid() {
    // Placeholder for the grid update function
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
 