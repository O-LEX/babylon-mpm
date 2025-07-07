import { Vector2 } from "@babylonjs/core";

const grid_res = 64;
const num_cells = grid_res * grid_res;

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

  constructor() {
    this.particles = [];
    this.cells = [];
  }
}
 