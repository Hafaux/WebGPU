import fragmentShader from "../shaders/fragment.wgsl?raw";
import vertexShader from "../shaders/vertex.wgsl?raw";
import { TriangleMesh } from "../meshes/TriangleMesh";
import { mat4 } from "gl-matrix";
import { CubeMesh } from "../meshes/CubeMesh";
import bebImg from "../images/beb.png";
import Material from "./Material";
import Camera from "./Camera";

export default class Renderer {
  canvas: HTMLCanvasElement;

  // Device/Context objects
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  // Pipeline objects
  uniformBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  // Assets
  triangleMesh!: TriangleMesh;

  aspectRatio!: number;
  cubeMesh!: CubeMesh;
  activeMesh!: CubeMesh | TriangleMesh;
  material!: Material;
  objectBuffer!: GPUBuffer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    try {
      await this.setupDevice();
    } catch (e) {
      alert(e);

      return;
    }

    this.initResize();

    await this.createAssets();

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

    this.bindGroup = this.device.createBindGroup({
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
          resource: this.material.textureView,
        },
        {
          binding: 2,
          resource: this.material.sampler,
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
        // cullMode: "back",
        // frontFace: "
      },

      layout: pipelineLayout,
    });
  }

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.cubeMesh = new CubeMesh(this.device);
    this.material = new Material(this.device);

    this.objectBuffer = this.device.createBuffer({
      label: "Model Buffer",
      size: 64 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.activeMesh = this.triangleMesh;

    await this.material.initialize(bebImg);
  }

  render(camera: Camera, data: Float32Array, objectCount: number) {
    const proj = mat4.create();

    mat4.perspective(proj, (60 / 180) * Math.PI, this.aspectRatio, 0.1, 100);

    const view = camera.getView();

    this.device.queue.writeBuffer(this.objectBuffer, 0, data, 0, data.length);
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
    });

    renderpass.setPipeline(this.pipeline);

    renderpass.setVertexBuffer(0, this.activeMesh.buffer);

    renderpass.setBindGroup(0, this.bindGroup);

    renderpass.draw(this.activeMesh.verticeCount, objectCount, 0, 0);

    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
