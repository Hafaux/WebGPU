import { BufferView, GlTf, MeshPrimitive } from "../types/Gltf";
import vertexShader from "../shaders/vertex.wgsl?raw";
import {
  gpuFormatForAccessor,
  gpuPrimitiveTopologyForMode,
} from "../utils/gltf";

const ShaderLocations = {
  POSITION: 0,
  NORMAL: 1,
};

/**
 * Singleton class for loading glTF files.
 *
 * resource used: https://toji.github.io/webgpu-gltf-case-study/
 */
class GltfLoader {
  private static instance: GltfLoader;

  private device!: GPUDevice;

  private constructor() {}

  public static getInstance(): GltfLoader {
    if (!GltfLoader.instance) GltfLoader.instance = new GltfLoader();

    return GltfLoader.instance;
  }

  public async load(device: GPUDevice, url: string) {
    if (!this.device) this.device = device;

    const gltf = await this.loadGltfJson(url);
    const buffers = await this.loadBuffers(gltf);

    return gltf.meshes!.map((mesh) => {
      const primitiveGpuData = new Map();

      mesh.primitives.forEach((primitive) => {
        const gpuData = this.setupPrimitive(gltf, primitive, device, buffers);

        primitiveGpuData.set(primitive, gpuData);
      });

      return primitiveGpuData;
    });
  }

  private async loadGltfJson(url: string): Promise<GlTf> {
    const response = await fetch(url);

    return response.json();
  }

  private loadBuffers(gltf: GlTf) {
    return Promise.all(
      gltf.buffers!.map(async (buffer) => {
        const response = await fetch(buffer.uri!);
        const arrayBuffer = await response.arrayBuffer();

        return arrayBuffer;
      })
    );
  }

  private getGpuBufferView(buffers: ArrayBuffer[], bufferView: BufferView) {
    const buffer = buffers[bufferView.buffer];

    const gpuBuffer = this.device.createBuffer({
      label: "Mesh Vertex Buffer",
      size: Math.ceil(bufferView.byteLength / 4) * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    const array = new Uint8Array(gpuBuffer.getMappedRange());

    array.set(
      new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength)
    );

    gpuBuffer.unmap();

    return gpuBuffer;
  }

  setupPrimitive(
    gltf: GlTf,
    primitive: MeshPrimitive,
    device: GPUDevice,
    buffers: ArrayBuffer[]
  ) {
    const bufferLayout: GPUVertexBufferLayout[] = [];
    const gpuBuffers = [];
    let drawCount = 0;

    // Loop through every attribute in the primitive and build a description of the vertex
    // layout, which is needed to create the render pipeline.
    for (const [attribName, accessorIndex] of Object.entries(
      primitive.attributes
    )) {
      const accessor = gltf.accessors![accessorIndex];
      const bufferView = gltf.bufferViews![accessor.bufferView!];

      // Get the shader location for this attribute. If it doesn't have one skip over the
      // attribute because we don't need it for rendering (yet).
      const shaderLocation =
        ShaderLocations[attribName as keyof typeof ShaderLocations];

      if (shaderLocation === undefined) {
        continue;
      }

      // Create a new vertex buffer entry for the render pipeline that describes this
      // attribute. Implicitly assumes that one buffer will be bound per attribute, even if
      // the attribute data is interleaved.
      bufferLayout.push({
        arrayStride: bufferView.byteStride! || 12,
        attributes: [
          {
            shaderLocation,
            format: gpuFormatForAccessor(accessor),
            offset: accessor.byteOffset,
          },
        ] as any,
      });

      // Since we're skipping some attributes, we need to track the WebGPU buffers that are
      // used here so that we can bind them in the correct order at draw time.
      gpuBuffers.push(this.getGpuBufferView(buffers, bufferView));

      // All attributes should have the same count, which will be the draw count for
      // non-indexed geometry.
      drawCount = accessor.count;
    }

    // Create a render pipeline that is compatible with the vertex buffer layout for this primitive.
    const pipeline = device.createRenderPipeline({
      label: "GLTF Mesh Render Pipeline",
      vertex: {
        module: this.device.createShaderModule({
          code: vertexShader,
        }),
        entryPoint: "main",
        buffers: bufferLayout,
      },
      primitive: {
        topology: gpuPrimitiveTopologyForMode(primitive.mode),
      },
      layout: "auto",
    });

    return {
      pipeline,
      buffers: gpuBuffers,
      drawCount,
    };
  }
}

export default GltfLoader.getInstance();
