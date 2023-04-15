import Camera from "./Camera";
import Triangle from "../meshes/Triangle";
import Quad from "../meshes/Quad";
import Controls from "../input/Controls";
import { mat4, vec2, vec3 } from "gl-matrix";
import { RenderData } from "../definitions";

export default class Scene {
  cubes: Triangle[] = [];
  quads: Quad[] = [];

  camera: Camera;

  objectData: Float32Array;

  cameraSpeed = 0.03;
  cameraSensitivity = 0.1;

  cameraVelocity: vec2 = [0, 0];

  constructor() {
    this.camera = new Camera([-5, 0, 0.5], 0, 0);

    this.objectData = new Float32Array(16 * 1024);

    this.makeCubes();
    this.makeQuads();

    this.initMouseMovement();
  }

  makeCubes() {
    const NUM_OBJECTS = 5;

    for (let i = 0; i < NUM_OBJECTS; i++) {
      const x = i * 3;

      this.cubes.push(new Triangle([0, x, 1], 0));

      this.objectData.set(mat4.create(), i * 16);
    }
  }

  makeQuads() {
    const NUM_OBJECTS = 1000;

    for (let i = 0; i < NUM_OBJECTS; i++) {
      this.quads.push(new Quad([(i % 40) - 10, Math.floor(i / 40) - 10, 0]));

      this.objectData.set(mat4.create(), this.cubes.length * 16 + i * 16);
    }
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

  update(deltaT: number) {
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
      this.cameraVelocity[0] * this.cameraSpeed * deltaT,
      this.cameraVelocity[1] * this.cameraSpeed * deltaT
    );

    this.cubes.forEach((triangle, i) => {
      triangle.update(deltaT);

      const model = triangle.getModel();

      if (!model) return;

      this.objectData.set(model, i * 16);
    });

    this.quads.forEach((quad, i) => {
      quad.update();

      const model = quad.getModel();

      if (!model) return;

      this.objectData.set(model, (i + this.cubes.length) * 16);
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
    return this.cubes;
  }

  getObjectData() {
    return this.objectData;
  }

  getRenderData(): RenderData {
    return {
      viewTransform: this.camera.getView(),
      modelTransforms: this.objectData,
      objectCounts: {
        TRIANGLE: this.cubes.length,
        QUAD: this.quads.length,
      },
    };
  }

  getObjectsLength() {
    return this.cubes.length;
  }

  getPlayer() {
    return this.camera;
  }
}
