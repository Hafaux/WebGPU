import { vec3, mat4 } from "gl-matrix";
import { degToRad } from "../utils/math";

export default class Obj {
  position: vec3;
  eulers: vec3;
  model?: mat4;

  constructor(position?: vec3, theta?: number) {
    this.position = position || vec3.fromValues(0, 0, 0);
    this.eulers = vec3.create();
    this.eulers[2] = theta || 0;
  }

  update(_deltaT: number) {
    this.eulers[2] += 0.1 * _deltaT;
    this.eulers[2] = this.eulers[2] % 360;

    this.model = mat4.create();

    mat4.translate(this.model, this.model, this.position);
    mat4.rotateZ(this.model, this.model, degToRad(this.eulers[2]));
  }

  getModel() {
    return this.model;
  }
}
