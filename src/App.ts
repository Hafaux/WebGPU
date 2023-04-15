import Renderer from "./renderer/Renderer";
import Scene from "./renderer/Scene";

export default class App {
  renderer: Renderer;
  scene: Scene;
  previousTime: number = 0;

  constructor(public canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this.canvas);
    this.scene = new Scene();
  }

  async init() {
    try {
      await this.renderer.init();

      this.update(0);
    } catch (e) {
      alert("WebGPU is not supported in this browser: " + e);
    }
  }

  update(time: number) {
    const deltaTime = time - this.previousTime;

    this.previousTime = time;

    this.scene.update(deltaTime);

    this.renderer.render(this.scene.getRenderData());

    requestAnimationFrame(this.update.bind(this));
  }
}
