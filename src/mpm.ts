import { Vector2 } from "@babylonjs/core";

const frameDt = 0.2;
const substeps = 1;
const dt = frameDt / substeps;
const gravity = [0, -0.3];

class Particle {
  x: Vector2;
  v: Vector2;
  C: [Vector2, Vector2] = [Vector2.Zero(), Vector2.Zero()]; // Affine term, will be used for deformation gradient
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
  num_grid: number = 64;
  num_cells: number = this.num_grid * this.num_grid;

  num_particles: number = 0;

  // Material parameters
  rest_density: number = 4.0; // Rest density of the material
  dynamic_viscosity: number = 0.1; // Dynamic viscosity
  eos_stiffness: number = 10.0; // Stiffness for the equation of state
  eos_power: number = 4.0; // Power for the equation of state

  constructor() {
    // initialising a bunch of points in a square
    const temp_positions: Vector2[] = [];
    const spacing = 0.5;
    const box_x = 32, box_y = 32;
    const sx = this.num_grid / 2.0, sy = this.num_grid / 2.0;

    for (let i = sx - box_x / 2; i < sx + box_x / 2; i += spacing) {
      for (let j = sy - box_y / 2; j < sy + box_y / 2; j += spacing) {
        const pos = new Vector2(i, j);
        temp_positions.push(pos);
      }
    }
    
    this.num_particles = temp_positions.length;

    // populate our array of particles, set their initial state
    for (let i = 0; i < this.num_particles; ++i) {
      const p = new Particle(temp_positions[i], Vector2.Zero(), 1.0);
      this.particles.push(p);
    }

    for (let i = 0; i < this.num_cells; i++) {
      this.cells.push(new Cell(Vector2.Zero(), 0));
    }
  }

  resetGrid() {
    for (let i = 0; i < this.num_cells; i++) {
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
          if (cell_x < 0 || cell_x >= this.num_grid || cell_y < 0 || cell_y >= this.num_grid) {
            continue;
          }

          const cell_index = cell_x * this.num_grid + cell_y;

          const mass = w * p.mass;
          this.cells[cell_index].mass += mass;

          const dist = new Vector2(cell_x + 0.5 - p.x.x, cell_y + 0.5 - p.x.y);
          const Q = new Vector2(
            p.C[0].x * dist.x + p.C[1].x * dist.y,
            p.C[0].y * dist.x + p.C[1].y * dist.y
          );
          this.cells[cell_index].v.x += mass * (p.v.x + Q.x);
          this.cells[cell_index].v.y += mass * (p.v.y + Q.y);
        }
      }
    }
  }

  particleToGrid2() {
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

      let density = 0;

      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const w = wx[gx] * wy[gy];

          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;

          // Boundary check
          if (cell_x < 0 || cell_x >= this.num_grid || cell_y < 0 || cell_y >= this.num_grid) {
            continue;
          }
          const cell_index = cell_x * this.num_grid + cell_y;
          density += this.cells[cell_index].mass * w;
        }
      }

      const volume = p.mass / density;

      // Compute pressure using Tait EOS with clamping
      const pressure = Math.max(
        -0.1,
        this.eos_stiffness * (Math.pow(density / this.rest_density, this.eos_power) - 1)
      );

      // Construct isotropic stress tensor (2x2 matrix)
      const stress = [
        [-pressure, 0],
        [0, -pressure]
      ];

      // Velocity gradient tensor (from affine matrix p.C)
      // Assuming p.C is a 2x2 matrix: [[c00, c01], [c10, c11]]
      const dudv = p.C;

      // Symmetric strain tensor approximation
      const trace = dudv[1].x + dudv[0].y;
      const strain = [
        [dudv[0].x, trace],
        [trace, dudv[1].y]
      ];

      // Viscosity term: dynamic_viscosity * strain
      const viscosity_term = strain.map(row => row.map(val => val * this.dynamic_viscosity));

      // Add viscosity term to stress tensor
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          stress[r][c] += viscosity_term[r][c];
        }
      }

      // Compute force contribution term: -volume * 4 * stress * dt
      const eq_16_term_0 = stress.map(row => row.map(val => -volume * 4 * val * dt));

      // Scatter force contribution to grid cells
      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const w = wx[gx] * wy[gy];

          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;

          if (cell_x < 0 || cell_x >= this.num_grid || cell_y < 0 || cell_y >= this.num_grid) {
            continue;
          }

          const cell_index = cell_x * this.num_grid + cell_y;

          // Compute cell distance vector
          const dist_x = cell_x - p.x.x + 0.5;
          const dist_y = cell_y - p.x.y + 0.5;

          // Calculate momentum contribution (stress * dist) * weight
          const momentum_x = (eq_16_term_0[0][0] * dist_x + eq_16_term_0[0][1] * dist_y) * w;
          const momentum_y = (eq_16_term_0[1][0] * dist_x + eq_16_term_0[1][1] * dist_y) * w;

          // Add momentum contribution to grid cell velocity (momentum)
          this.cells[cell_index].v.x += momentum_x;
          this.cells[cell_index].v.y += momentum_y;
        }
      }
    }
  }

  updateGrid() {
    for (let i = 0; i < this.num_cells; i++) {
      const cell = this.cells[i];
      if (cell.mass === 0) continue;  

        cell.v.x /= cell.mass; // velocity
        cell.v.y /= cell.mass;
  
        cell.v.x += gravity[0] * dt;
        cell.v.y += gravity[1] * dt;
  
        // Boundary conditions: hard wall (zero velocity)
        const x = Math.floor(i / this.num_grid);
        const y = i % this.num_grid;

        if (x < 2 || x > this.num_grid - 3) {
          cell.v.x = 0;
        }
        if (y < 2 || y > this.num_grid - 3) {
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
      let B = [Vector2.Zero(), Vector2.Zero()];
  
      for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          const w = wx[gx] * wy[gy];
  
          const cell_x = base_x - 1 + gx;
          const cell_y = base_y - 1 + gy;

          if (cell_x < 0 || cell_x >= this.num_grid || cell_y < 0 || cell_y >= this.num_grid) continue;

          const cell_index = cell_x * this.num_grid + cell_y;
          const cell = this.cells[cell_index];

          const dist = new Vector2(cell_x + 0.5 - p.x.x, cell_y + 0.5 - p.x.y);
          const weighted_v = cell.v.scale(w); // grid velocity × weight

          vx += weighted_v.x;
          vy += weighted_v.y;

           // outer product: weighted_v ⊗ dist
          B[0].x += weighted_v.x * dist.x;
          B[0].y += weighted_v.y * dist.x;
          B[1].x += weighted_v.x * dist.y;
          B[1].y += weighted_v.y * dist.y;
        }
      }
  
      // Store updated velocity
      p.v.x = vx;
      p.v.y = vy;

      // APIC: compute affine C from B (D⁻¹ = 4 for quadratic B-spline)
      p.C[0] = B[0].scale(4);
      p.C[1] = B[1].scale(4);
  
      // Advect particle
      p.x.x += p.v.x * dt;
      p.x.y += p.v.y * dt;
  
      // Clamp to simulation domain
      p.x.x = Math.min(Math.max(p.x.x, 1), this.num_grid - 2);
      p.x.y = Math.min(Math.max(p.x.y, 1), this.num_grid - 2);
    }
  }
  

  step() {
    this.resetGrid();
    this.particleToGrid();
    this.particleToGrid2();
    this.updateGrid();
    this.gridToParticle();
  }  
}
 