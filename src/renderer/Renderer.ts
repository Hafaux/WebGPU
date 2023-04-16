import fragmentShader from "../shaders/fragment.wgsl?raw";
import vertexShader from "../shaders/vertex.wgsl?raw";
import { TriangleMesh } from "../meshes/TriangleMesh";
import { mat4 } from "gl-matrix";
import { CubeMesh } from "../meshes/CubeMesh";
import capyImg from "../images/capy.png";
import floorImg from "../images/grass_0.png";
import Material from "./Material";
import { QuadMesh } from "../meshes/QuadMesh";
import { RenderData, ObjectType } from "../definitions";

export default class Renderer {
  canvas: HTMLCanvasElement;

  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  pipeline!: GPURenderPipeline;
  frameGroupLayout!: GPUBindGroupLayout;
  materialGroupLayout!: GPUBindGroupLayout;
  frameBindGroup!: GPUBindGroup;

  // Depth stencil
  depthStencilAttachment!: GPURenderPassDepthStencilAttachment;
  depthTexture!: GPUTexture;
  depthTextureView!: GPUTextureView;
  depthStencilState!: GPUDepthStencilState;

  // Assets
  meshDict!: {
    [ObjectType.QUAD]: {
      mesh: QuadMesh;
      defaultMaterial: Material;
    };
    [ObjectType.TRIANGLE]: {
      mesh: TriangleMesh;
      defaultMaterial: Material;
    };
    [ObjectType.CUBE]: {
      mesh: CubeMesh;
      defaultMaterial: Material;
    };
  };

  aspectRatio!: number;
  objectBuffer!: GPUBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    await this.setupDevice();

    this.makeBindGroupLayouts();

    this.initResize();

    await this.createAssets();

    this.makeBindGroups();

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

    // handle depth buffer resize
    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
        depthOrArrayLayers: 1,
      },
      format: "depth24plus-stencil8",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.depthTextureView = this.depthTexture.createView();
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

  makeBindGroupLayouts() {
    this.frameGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
      ],
    });

    this.materialGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
  }

  makeBindGroups() {
    this.uniformBuffer = this.device.createBuffer({
      label: "Uniform Buffer",
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.objectBuffer = this.device.createBuffer({
      label: "Model Buffer",
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.frameBindGroup = this.device.createBindGroup({
      layout: this.frameGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.objectBuffer,
          },
        },
      ],
    });
  }

  async createAssets() {
    const defaultMaterial = new Material(this.device);
    const quadMaterial = new Material(this.device);

    await defaultMaterial.initialize(capyImg, this.materialGroupLayout);
    await quadMaterial.initialize(floorImg, this.materialGroupLayout);

    this.meshDict = {
      CUBE: {
        mesh: new CubeMesh(this.device),
        defaultMaterial: defaultMaterial,
      },
      QUAD: {
        mesh: new QuadMesh(this.device),
        defaultMaterial: quadMaterial,
      },
      TRIANGLE: {
        mesh: new TriangleMesh(this.device),
        defaultMaterial: defaultMaterial,
      },
    };
  }

  async makePipeline() {
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.frameGroupLayout, this.materialGroupLayout],
    });

    this.pipeline = await this.device.createRenderPipelineAsync({
      vertex: {
        module: this.device.createShaderModule({
          code: vertexShader,
        }),
        entryPoint: "main",
        buffers: [this.meshDict.CUBE.mesh.bufferLayout],
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
    renderpass.setBindGroup(0, this.frameBindGroup);

    let objectsDrawn = 0;

    for (const [objectType, objectCount] of Object.entries(
      renderables.objectCounts
    )) {
      if (objectCount <= 0) continue;

      const data = this.meshDict[objectType as ObjectType];

      renderpass.setVertexBuffer(0, data.mesh.buffer);
      renderpass.setBindGroup(1, data.defaultMaterial.bindGroup);

      renderpass.draw(data.mesh.verticeCount, objectCount, 0, objectsDrawn);

      objectsDrawn += objectCount;
    }

    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
