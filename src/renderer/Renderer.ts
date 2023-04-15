import fragmentShader from "../shaders/fragment.wgsl?raw";
import vertexShader from "../shaders/vertex.wgsl?raw";
import { TriangleMesh } from "../meshes/TriangleMesh";
import { mat4 } from "gl-matrix";
import { CubeMesh } from "../meshes/CubeMesh";
import bebImg from "../images/beb.png";
import floorImg from "../images/grass_0.png";
import Material from "./Material";
import { QuadMesh } from "../meshes/QuadMesh";
import { RenderData } from "../definitions";

export default class Renderer {
  canvas: HTMLCanvasElement;

  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  triangleBindGroup!: GPUBindGroup;
  quadBindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  // Depth stencil
  depthStencilAttachment!: GPURenderPassDepthStencilAttachment;
  depthTexture!: GPUTexture;
  depthTextureView!: GPUTextureView;
  depthStencilState!: GPUDepthStencilState;

  // Assets
  triangleMesh!: TriangleMesh;
  quadMesh!: TriangleMesh;
  cubeMesh!: CubeMesh;

  aspectRatio!: number;
  activeMesh!: CubeMesh | TriangleMesh | QuadMesh;
  triangleMaterial!: Material;
  quadMaterial!: Material;
  objectBuffer!: GPUBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    await this.setupDevice();

    this.initResize();

    await this.createAssets();

    this.makeDepthBufferResources();

    await this.makePipeline();
  }

  initResize() {
    this.onResize();

    window.addEventListener("resize", this.onResize.bind(this));
  }

  onResize() {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;

    this.aspectRatio = this.canvas.width / this.canvas.height;
  }

  async setupDevice() {
    this.adapter = (await navigator.gpu?.requestAdapter())!;

    if (!this.adapter) {
      throw new Error("No adapter found");
    }

    this.device = await this.adapter?.requestDevice();

    if (!this.device) {
      throw new Error("No device found");
    }

    this.context = this.canvas.getContext("webgpu")!;

    if (!this.context) {
      throw new Error("No context found");
    }

    this.format = "bgra8unorm";

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });
  }

  makeDepthBufferResources() {
    this.depthStencilState = {
      format: "depth24plus-stencil8",
      depthWriteEnabled: true,
      depthCompare: "less-equal",
    };

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
        depthOrArrayLayers: 1,
      },
      format: "depth24plus-stencil8",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.depthTextureView = this.depthTexture.createView({
      format: "depth24plus-stencil8",
      aspect: "all",
    });

    this.depthStencilAttachment = {
      view: this.depthTextureView,

      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",

      stencilLoadOp: "clear",
      stencilStoreOp: "discard",
    };
  }

  async makePipeline() {
    this.uniformBuffer = this.device.createBuffer({
      label: "Uniform Buffer",
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
      ],
    });

    this.triangleBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: this.triangleMaterial.textureView,
        },
        {
          binding: 2,
          resource: this.triangleMaterial.sampler,
        },
        {
          binding: 3,
          resource: {
            buffer: this.objectBuffer,
          },
        },
      ],
    });

    this.quadBindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: this.quadMaterial.textureView,
        },
        {
          binding: 2,
          resource: this.quadMaterial.sampler,
        },
        {
          binding: 3,
          resource: {
            buffer: this.objectBuffer,
          },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = await this.device.createRenderPipelineAsync({
      vertex: {
        module: this.device.createShaderModule({
          code: vertexShader,
        }),
        entryPoint: "main",
        buffers: [this.activeMesh.bufferLayout],
      },

      fragment: {
        module: this.device.createShaderModule({
          code: fragmentShader,
        }),
        entryPoint: "main",
        targets: [
          {
            format: this.format,
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        // frontFace: "ccw",
      },

      layout: pipelineLayout,
      depthStencil: this.depthStencilState,
    });
  }

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.triangleMaterial = new Material(this.device);

    this.quadMesh = new QuadMesh(this.device);
    this.quadMaterial = new Material(this.device);

    this.cubeMesh = new CubeMesh(this.device);

    this.objectBuffer = this.device.createBuffer({
      label: "Model Buffer",
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.activeMesh = this.cubeMesh;

    await this.triangleMaterial.initialize(bebImg);
    await this.quadMaterial.initialize(floorImg);
  }

  render(renderables: RenderData) {
    const proj = mat4.create();

    mat4.perspective(proj, (60 / 180) * Math.PI, this.aspectRatio, 0.1, 100);

    const view = renderables.viewTransform;

    this.device.queue.writeBuffer(
      this.objectBuffer,
      0,
      renderables.modelTransforms,
      0,
      renderables.modelTransforms.length
    );

    this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>view);
    this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>proj);

    //command encoder: records draw commands for submission
    const commandEncoder = this.device.createCommandEncoder();

    //texture view: image view to the color buffer in this case
    const textureView = this.context.getCurrentTexture().createView();

    //renderpass: holds draw commands, allocated from command encoder
    const renderpass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.2, b: 0.3, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: this.depthStencilAttachment,
    });

    renderpass.setPipeline(this.pipeline);

    let objectsDrawn = 0;

    renderpass.setVertexBuffer(0, this.cubeMesh.buffer);
    renderpass.setBindGroup(0, this.triangleBindGroup);

    renderpass.draw(
      this.cubeMesh.verticeCount,
      renderables.objectCounts.TRIANGLE,
      0,
      objectsDrawn
    );

    objectsDrawn += renderables.objectCounts.TRIANGLE;

    renderpass.setVertexBuffer(0, this.quadMesh.buffer);
    renderpass.setBindGroup(0, this.quadBindGroup);

    renderpass.draw(
      this.quadMesh.verticeCount,
      renderables.objectCounts.QUAD,
      0,
      objectsDrawn
    );

    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
