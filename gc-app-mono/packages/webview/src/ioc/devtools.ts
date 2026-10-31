import { ipcTauri } from "./ipcTauri.ts";

class Devtools {
  async toggle(webviewId: string) {
    await ipcTauri.invoke("toggle_devtools", { webviewId });
  }

  async open(webviewId: string) {
    await ipcTauri.invoke("toggle_devtools", { webviewId });
  }

  async close(webviewId: string) {
    await ipcTauri.invoke("toggle_devtools", { webviewId });
  }
}

export const devtools = new Devtools();
