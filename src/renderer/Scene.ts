import Camera from "./Camera";
import Triangle from "../meshes/Triangle";
import Controls from "../input/Controls";
import { mat4, vec2, vec3 } from "gl-matrix";

export default class Scene {
  objects: Triangle[] = [];
  camera: Camera;

  objectData: Float32Array;

  cameraSpeed = 0.03;
  cameraSensitivity = 0.1;

  cameraVelocity: vec2 = [0, 0];

  constructor() {
    this.camera = new Camera([-2, 0, 0], 0, 0);

    this.objectData = new Float32Array(16 * 1024);

    const NUM_OBJECTS = 20;

    for (let i = 0; i < NUM_OBJECTS; i++) {
      const y = (i / NUM_OBJECTS) * 5 - 2;
      const z = 0;

      this.objects.push(new Triangle([0, y, z], 0));

      this.objectData.set(mat4.create(), i * 16);
    }

    this.initMouseMovement();
  }

  initMouseMovement() {
    Controls.onPointerMove((e) => {
      this.camera.eulers[2] -= e.movementX * this.cameraSensitivity;
      this.camera.eulers[2] %= 360;

      this.camera.eulers[1] = Math.max(
        -90,
        Math.min(
          90,
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

    this.objects.forEach((triangle, i) => {
      triangle.update();

      const model = triangle.getModel();

      if (!model) return;

      this.objectData.set(model, i * 16);
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
    return this.objects;
  }

  getObjects() {
    return this.objectData;
  }

  getObjectsLength() {
    return this.objects.length;
  }

  getPlayer() {
    return this.camera;
  }
}
