export class CubeMesh {
  buffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;

  verticeCount = 36;

  constructor(device: GPUDevice) {
    const vertices: Float32Array = new Float32Array([
      // float3 position, float2 uv
      // face1
      +1, -1, +1, 1, 1, -1, -1, +1, 0, 1, -1, -1, -1, 0, 0, +1, -1, -1, 1, 0,
      +1, -1, +1, 1, 1, -1, -1, -1, 0, 0,
      // face2
      +1, +1, +1, 1, 1, +1, -1, +1, 0, 1, +1, -1, -1, 0, 0, +1, +1, -1, 1, 0,
      +1, +1, +1, 1, 1, +1, -1, -1, 0, 0,
      // face3
      -1, +1, +1, 1, 1, +1, +1, +1, 0, 1, +1, +1, -1, 0, 0, -1, +1, -1, 1, 0,
      -1, +1, +1, 1, 1, +1, +1, -1, 0, 0,
      // face4
      -1, -1, +1, 1, 1, -1, +1, +1, 0, 1, -1, +1, -1, 0, 0, -1, -1, -1, 1, 0,
      -1, -1, +1, 1, 1, -1, +1, -1, 0, 0,
      // face5
      +1, +1, +1, 1, 1, -1, +1, +1, 0, 1, -1, -1, +1, 0, 0, -1, -1, +1, 0, 0,
      +1, -1, +1, 1, 0, +1, +1, +1, 1, 1,
      // face6
      +1, -1, -1, 1, 1, -1, -1, -1, 0, 1, -1, +1, -1, 0, 0, +1, +1, -1, 1, 0,
      +1, -1, -1, 1, 1, -1, +1, -1, 0, 0,
    ]);

    this.buffer = device.createBuffer({
      label: "Cube Mesh Buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(this.buffer.getMappedRange()).set(vertices);

    this.buffer.unmap();

    this.bufferLayout = {
      arrayStride: 5 * 4,
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
}
