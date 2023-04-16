import type { mat4 } from "gl-matrix";

export enum ObjectType {
  TRIANGLE = "TRIANGLE",
  QUAD = "QUAD",
  CUBE = "CUBE",
}

export interface RenderData {
  viewTransform: mat4;
  modelTransforms: Float32Array;
  objectCounts: {
    [key in ObjectType]: number;
  };
}
