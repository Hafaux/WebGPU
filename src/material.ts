import { getImageBitmap } from "./utils/image";

export default class Material {
  texture!: GPUTexture;
  textureView!: GPUTextureView;
  sampler!: GPUSampler;

  constructor(private device: GPUDevice) {}

  async initialize(src: string) {
    await this.loadImage(src);

    const viewDestriptor: GPUTextureViewDescriptor = {
      format: "rgba8unorm",
      dimension: "2d",
      aspect: "all",
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 1,
    };

    console.warn(this.texture);

    this.textureView = this.texture.createView(viewDestriptor);

    const samplerDestriptor: GPUSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 1,
    };

    this.sampler = this.device.createSampler(samplerDestriptor);
  }

  async loadImage(src: string) {
    const imageData = await getImageBitmap(src);
    const size = {
      width: imageData.width,
      height: imageData.height,
    };

    this.texture = this.device.createTexture({
      size,
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      {
        source: imageData,
      },
      {
        texture: this.texture,
      },
      size
    );
  }
}
