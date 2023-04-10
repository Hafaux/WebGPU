import { Renderer } from "./renderer/Renderer";

async function init() {
  const canvas = document.querySelector("canvas")!;

  const renderer = new Renderer(canvas);

  renderer.Initialize();
}

init();
