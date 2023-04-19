import { Accessor, MeshPrimitive } from "../types/Gltf";

function numberOfComponentsForType(type: string) {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    default:
      return 0;
  }
}

export function gpuFormatForAccessor(accessor: Accessor) {
  const norm = accessor.normalized ? "norm" : "int";
  const count = numberOfComponentsForType(accessor.type);
  const x = count > 1 ? `x${count}` : "";

  switch (accessor.componentType) {
    case WebGLRenderingContext.BYTE:
      return `s${norm}8${x}`;
    case WebGLRenderingContext.UNSIGNED_BYTE:
      return `u${norm}8${x}`;
    case WebGLRenderingContext.SHORT:
      return `s${norm}16${x}`;
    case WebGLRenderingContext.UNSIGNED_SHORT:
      return `u${norm}16${x}`;
    case WebGLRenderingContext.UNSIGNED_INT:
      return `u${norm}32${x}`;
    case WebGLRenderingContext.FLOAT:
      return `float32${x}`;
    default:
      return "";
  }
}

export function gpuPrimitiveTopologyForMode(mode: MeshPrimitive["mode"]) {
  switch (mode) {
    case WebGLRenderingContext.TRIANGLES:
      return "triangle-list";
    case WebGLRenderingContext.TRIANGLE_STRIP:
      return "triangle-strip";
    case WebGLRenderingContext.LINES:
      return "line-list";
    case WebGLRenderingContext.LINE_STRIP:
      return "line-strip";
    case WebGLRenderingContext.POINTS:
      return "point-list";
    default:
      return "triangle-list";
  }
}
