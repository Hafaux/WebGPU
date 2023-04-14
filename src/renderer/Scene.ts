import Camera from "./Camera";
import Triangle from "../meshes/Triangle";
import Controls from "../input/Controls";
import { vec2, vec3, mat4 } from "gl-matrix";

export default class Scene {
  triangles: Triangle[] = [];
  camera: Camera;

  objectData: Float32Array;
  triangleCount = 0;

  cameraSpeed = 0.03;
  cameraSensitivity = 0.1;

  cameraVelocity: vec2 = [0, 0];

  constructor() {
    this.triangles.push(new Triangle([0, 0, 0], 0));
    this.camera = new Camera([-2, 0, 0], 0, 0);

    this.objectData = new Float32Array(16 * 1024);

    let i = 0;
    for (let y = -5; y < 5; y++) {
      const triangle = new Triangle([2, y, 0], 0);

      this.triangles.push(triangle);

      const blankMatrix = mat4.create();

      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = blankMatrix.at(j)!;
      }

      i++;

      this.triangleCount++;
    }

    this.initMouseMovement();
  }

  initMouseMovement() {
    Controls.onPointerMove((e) => {
      this.camera.eulers[2] -= e.movementX * this.cameraSensitivity;
      this.camera.eulers[2] %= 360;

      this.camera.eulers[1] = Math.max(
        -89,
        Math.min(
          89,
          this.camera.eulers[1] - e.movementY * this.cameraSensitivity
        )
      );
    });
  }

  update() {
    if (Controls.isKeyDown("KeyW")) {
      this.cameraVelocity[1] = 1;
    } else if (Controls.isKeyDown("KeyS")) {
      this.cameraVelocity[1] = -1;
    } else {
      this.cameraVelocity[1] = 0;
    }

    if (Controls.isKeyDown("KeyA")) {
      this.cameraVelocity[0] = -1;
    } else if (Controls.isKeyDown("KeyD")) {
      this.cameraVelocity[0] = 1;
    } else {
      this.cameraVelocity[0] = 0;
    }

    this.moveCamera(
      this.cameraVelocity[0] * this.cameraSpeed,
      this.cameraVelocity[1] * this.cameraSpeed
    );

    let i = 0;

    this.triangles.forEach((triangle) => {
      triangle.update();

      const model = triangle.getModel();

      if (!model) return;

      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = model.at(j)!;
      }

      i++;
    });

    this.camera.update();
  }

  moveCamera(dx: number, dy: number) {
    vec3.scaleAndAdd(
      this.camera.position,
      this.camera.position,
      this.camera.right,
      dx
    );
    vec3.scaleAndAdd(
      this.camera.position,
      this.camera.position,
      this.camera.forwards,
      dy
    );
  }

  getTriangles() {
    return this.objectData;
  }

  getPlayer() {
    return this.camera;
  }
}
