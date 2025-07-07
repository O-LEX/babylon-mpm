import { Vector3, Matrix, Vector2} from "@babylonjs/core";

class Particle {
  pos: Vector2;
  vel: Vector2;
  C: Matrix; // affine velocity field
  F: Matrix; // deformation gradient
  mass: number;

  constructor(pos: Vector2, mass: number) {
    this.pos = pos;
    this.vel = Vector2.Zero();
    this.C = Matrix.Identity();
    this.F = Matrix.Identity();
    this.mass = mass;
  }
}

export class MPM {
  particles: Particle[] = [];
  quality: number;
  n_grid: number;
  dx: number;
  inv_dx: number;
  grid_v: Vector2[][] = [];  // grid velocities
  grid_v0: Vector2[][] = []; // previous grid velocities
  grid_m: number[][] = [];

  constructor(quality: number, n_particles: number) {
    this.quality = quality;
    this.n_grid = 96 * quality;
    this.dx = 1 / this.n_grid;
    this.inv_dx = this.n_grid;

    for(let i=0; i<n_particles; i++) {
      const pos = new Vector2(Math.random(), Math.random());
      this.particles.push(new Particle(pos, 1));
    }

    for(let i=0; i<this.n_grid; i++) {
      this.grid_v.push([]);
      this.grid_v0.push([]);
      this.grid_m.push([]);
      for(let j=0; j<this.n_grid; j++) {
        this.grid_v[i][j] = Vector2.Zero();
        this.grid_v0[i][j] = Vector2.Zero();
        this.grid_m[i][j] = 0;
      }
    }
  }

  particleToGrid() {
    // Clear grid
    for(let i=0; i<this.dx; i++) {
      for(let j=0; j<this.dx; j++) {
        this.grid_v[i][j].setAll(0);
        this.grid_v0[i][j].setAll(0);
        this.grid_m[i][j] = 0;
      }
    }
    // particles to grid (P2G)
    this.particles.forEach(p => {
      const xp = p.pos;
      const vp = p.vel;
      const base = xp.scale(this.inv_dx).subtract(new Vector2(0.5, 0.5)).floor();
      const fx = xp.scale(this.inv_dx).subtract(base);
      // Weight kernel and scatter (simplified)
      this.grid_v[baseX][baseY].addInPlace(p.vel.scale(p.mass));
      this.grid_m[baseX][baseY] += p.mass;
    });
    // Normalize velocity by mass
    for(let i=0; i<this.dx; i++) {
      for(let j=0; j<this.dx; j++) {
        if (this.grid_m[i][j] > 0) {
          this.grid_v[i][j] = this.grid_v[i][j].scale(1 / this.grid_m[i][j]);
        }
      }
    }
  }

  gridUpdate(dt: number) {
    // Apply external forces, collisions, boundary conditions here
    for(let i=0; i<this.dx; i++) {
      for(let j=0; j<this.dx; j++) {
        if(this.grid_m[i][j] > 0) {
          // gravity
          this.grid_v[i][j].y -= 9.81 * dt;
          
          // Enhanced boundary conditions with friction
          const vel = this.grid_v[i][j];
          
          // Left boundary
          if (i < 3 && vel.x < 0) {
            vel.x = 0;
            vel.y *= (1.0 - this.sideFriction);
          }
          
          // Right boundary
          if (i > this.dx - 3 && vel.x > 0) {
            vel.x = 0;
            vel.y *= (1.0 - this.sideFriction);
          }
          
          // Bottom boundary
          if (j < 3 && vel.y < 0) {
            vel.x *= (1.0 - this.groundFriction);
            vel.y = 0;
          }
          
          // Top boundary
          if (j > this.dx - 3 && vel.y > 0) {
            vel.x *= (1.0 - this.sideFriction);
            vel.y = 0;
          }
        }
      }
    }
  }

  gridToParticle(dt: number) {
    // Interpolate grid velocity back to particles (G2P)
    this.particles.forEach(p => {
      const baseX = Math.floor(p.pos.x * this.dx);
      const baseY = Math.floor(p.pos.y * this.dx);
      // simplified bilinear interpolation:
      let newVel = Vector3.Zero();
      for(let i=0; i<=1; i++) {
        for(let j=0; j<=1; j++) {
          const gx = baseX + i;
          const gy = baseY + j;
          if(gx < this.dx && gy < this.dx) {
            newVel.addInPlace(this.grid_v[gx][gy].scale(0.25)); // equal weight for example
          }
        }
      }
      p.vel = newVel;
      p.pos.addInPlace(newVel.scale(dt));
    });
  }

  step(dt: number) {
    this.particleToGrid();
    this.gridUpdate(dt);
    this.gridToParticle(dt);
  }
}
