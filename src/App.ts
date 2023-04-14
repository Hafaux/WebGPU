import Renderer from "./renderer/Renderer";
import Scene from "./renderer/Scene";

export default class App {
  renderer: Renderer;
  scene: Scene;

  constructor(public canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(this.canvas);
    this.scene = new Scene();
  }

  async init() {
    await this.renderer.init();

    this.update();
  }

  update() {
    this.scene.update();

    this.renderer.render(
      this.scene.getPlayer(),
      this.scene.getObjects(),
      this.scene.getObjectsLength()
    );

    requestAnimationFrame(this.update.bind(this));
  }
}
