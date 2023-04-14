import { vec3, mat4 } from "gl-matrix";
import { DegToRad } from "../utils/math";

export default class Triangle {
  position: vec3;
  eulers: vec3;
  model?: mat4;

  constructor(position?: vec3, theta?: number) {
    this.position = position || vec3.fromValues(0, 0, 0);
    this.eulers = vec3.create();
    this.eulers[2] = theta || 0;
  }

  update() {
    this.eulers[2] += 1;
    this.eulers[2] = this.eulers[2] % 360;

    this.model = mat4.create();

    mat4.translate(this.model, this.model, this.position);
    mat4.rotateZ(this.model, this.model, DegToRad(this.eulers[2]));
  }

  getModel() {
    return this.model;
  }
}
