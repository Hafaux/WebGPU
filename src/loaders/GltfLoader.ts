import { mat4, vec3 } from "gl-matrix";
import { BufferView, GlTf, MeshPrimitive, Node } from "../types/Gltf";
import {
  gpuFormatForAccessor,
  gpuPrimitiveTopologyForMode,
} from "../utils/gltf";

const ShaderLocations = {
  POSITION: 0,
  NORMAL: 1,
};

import * as glm from "gl-matrix";

// @ts-ignore
window.glm = glm;

let shaderModule: GPUShaderModule;

/**
 * Singleton class for loading glTF files.
 *
 * resource used: https://toji.github.io/webgpu-gltf-case-study/
 */
class GltfLoader {
  private static instance: GltfLoader;

  private device!: GPUDevice;

  private nodeBindGroupLayout!: GPUBindGroupLayout;

  private constructor() {}

  public static getInstance(): GltfLoader {
    if (!GltfLoader.instance) GltfLoader.instance = new GltfLoader();

    return GltfLoader.instance;
  }

  public async load(device: GPUDevice, url: string) {
    if (!this.device) {
      this.device = device;

      this.nodeBindGroupLayout = this.device.createBindGroupLayout({
        label: "Node Bind Group Layout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {},
          },
        ],
      });
    }

    const gltf = await this.loadGltfJson(url);
    const buffers = await this.loadBuffers(gltf);
    const nodeGpuData = new Map<Node, { bindGroup: GPUBindGroup }>();
    const primitiveGpuData = new Map();

    gltf.meshes?.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        const gpuData = this.setupPrimitive(gltf, primitive, device, buffers);

        primitiveGpuData.set(primitive, gpuData);
      });

      return primitiveGpuData;
    });

    gltf.nodes?.forEach((node) => {
      if ("mesh" in node) {
        const bindGroup = this.setupMeshNodeBindGroup(node)!;

        nodeGpuData.set(node, { bindGroup });
      }
    });

    console.warn("nodeGpuData", nodeGpuData);
    console.warn("primitiveGpuData", primitiveGpuData);

    return gltf;
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

  getNodeWorldTransform(node: Node) {
    if (node.matrix) return new Float32Array(node.matrix);

    const worldMatrix = mat4.create();

    mat4.fromRotationTranslationScale(
      worldMatrix,
      node.rotation,
      (node.translation as vec3) || vec3.create(),
      node.scale as vec3
    );

    return worldMatrix as Float32Array;
  }

  setupMeshNodeBindGroup(node: Node) {
    if (node.mesh === undefined) return;

    const nodeGpuBuffer = this.device.createBuffer({
      label: "Node Buffer",
      size: 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      nodeGpuBuffer,
      0,
      this.getNodeWorldTransform(node)
    );

    // bind group
    const nodeBindGroup = this.device.createBindGroup({
      label: "Node Bind Group",
      layout: this.nodeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: nodeGpuBuffer,
          },
        },
      ],
    });

    return nodeBindGroup;
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
            offset: accessor.byteOffset || 0,
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
        module: getShaderModule(this.device),
        entryPoint: "vertexMain",
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

function getShaderModule(device: GPUDevice) {
  // Cache the shader module, since all the pipelines use the same one.
  if (!shaderModule) {
    // The shader source used here is intentionally minimal. It just displays the geometry
    // as white with a very simplistic directional lighting based only on vertex normals
    // (just to show the shape of the mesh a bit better.)
    const code = `
      // These are being managed in the demo base code.
      struct Camera {
        projection : mat4x4f,
        view : mat4x4f,
      };
      @group(0) @binding(0) var<uniform> camera : Camera;

      // This comes from the bind groups being created in setupMeshNode in the next section.
      @group(1) @binding(0) var<uniform> model : mat4x4f;

      // These locations correspond with the values in the ShaderLocations struct in our JS and, by
      // extension, the buffer attributes in the pipeline vertex state.
      struct VertexInput {
        @location(${ShaderLocations.POSITION}) position : vec3f,
        @location(${ShaderLocations.NORMAL}) normal : vec3f,
      };

      struct VertexOutput {
        // Always need to at least output something to the position builtin.
        @builtin(position) position : vec4f,

        // The other locations can be anything you want, as long as it's consistent between the
        // vertex and fragment shaders. Since we're defining both in the same module and using the
        // same structure for the input and output, we get that alignment for free!
        @location(0) normal : vec3f,
      };

      @vertex
      fn vertexMain(input : VertexInput) -> VertexOutput {
        // Determines the values that will be sent to the fragment shader.
        var output : VertexOutput;

        // Transform the vertex position by the model/view/projection matrices.
        output.position = camera.projection * camera.view * model * vec4f(input.position, 1);

        // Transform the normal by the model and view matrices. Normally you'd just do model matrix,
        // but adding the view matrix in this case is a hack to always keep the normals pointing
        // towards the light, so that we can clearly see the geometry even as we rotate it.
        output.normal = normalize((camera.view * model * vec4f(input.normal, 0)).xyz);

        return output;
      }

      // Some hardcoded lighting constants.
      const lightDir = vec3f(0.25, 0.5, 1);
      const lightColor = vec3f(1);
      const ambientColor = vec3f(0.1);

      @fragment
      fn fragmentMain(input : VertexOutput) -> @location(0) vec4f {
        // An extremely simple directional lighting model, just to give our model some shape.
        let N = normalize(input.normal);
        let L = normalize(lightDir);
        let NDotL = max(dot(N, L), 0.0);

        // Surface color will just be the light color, so everything will appear white/grey.
        let surfaceColor = ambientColor + NDotL;

        // No transparency at this point.
        return vec4f(surfaceColor, 1);
      }
    `;

    shaderModule = device.createShaderModule({ code });
  }

  return shaderModule;
}

export default GltfLoader.getInstance();
