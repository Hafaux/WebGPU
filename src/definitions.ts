import type { mat4 } from "gl-matrix";

export enum ObjectTypes {
  TRIANGLE = "TRIANGLE",
  QUAD = "QUAD",
}

export interface RenderData {
  viewTransform: mat4;
  modelTransforms: Float32Array;
  objectCounts: {
    [key in ObjectTypes]: number;
  };
}
