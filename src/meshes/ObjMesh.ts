import ObjLoader, { ObjModel } from "./ObjLoader";

export class ObjMesh {
  buffer!: GPUBuffer;
  bufferLayout!: GPUVertexBufferLayout;

  model!: ObjModel;

  async init() {
    this.model = await ObjLoader.load(this.objFileUrl);

    this.buffer = this.device.createBuffer({
      label: "Mesh Vertex Buffer",
      size: this.model.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(this.buffer.getMappedRange()).set(this.model.vertexData);

    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 5 * 4, // 5 floats per vertex, 4 bytes per float - x y z u v
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0,
        },
        {
          shaderLocation: 1,
          format: "float32x2",
          offset: 3 * 4,
        },
      ],
    };
  }

  constructor(private device: GPUDevice, private objFileUrl: string) {}
}
