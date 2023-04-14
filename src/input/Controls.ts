export default class Controls {
  static keys: Map<string, boolean> = new Map();

  private static pointerCb?: (e: PointerEvent) => void;

  static pointerLocked = false;

  static init() {
    window.addEventListener("keydown", (e) => {
      this.keys.set(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
    });

    window.addEventListener("pointermove", (e) => {
      if (this.pointerLocked) this.pointerCb?.(e);
    });

    window.addEventListener("click", () => {
      document.body.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement !== null;
    });
  }

  static isKeyDown(key: string) {
    return this.keys.get(key);
  }

  static onPointerMove(cb: (e: PointerEvent) => void) {
    this.pointerCb = cb;
  }
}

Controls.init();
