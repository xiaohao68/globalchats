import { AbstractLifeCycle } from "@gc/misc";
import { createRoot, Root } from "react-dom/client";
import { App } from "./App.tsx";
import styles from "./appStyle.css?inline";
import { attachStyleSheet } from "@gc/utils";
import { gcEngineAppRootId } from "../utils";

class Renderer implements AbstractLifeCycle {
  root?: Root;

  mount() {
    attachStyleSheet(styles);
    const rootDom = document.createElement("div");
    rootDom.id = gcEngineAppRootId;
    document.body.appendChild(rootDom);
    this.root = createRoot(rootDom);
    this.root.render(<App />);
  }

  destroy() {
    this.root?.unmount();
  }
}

export const renderer = new Renderer();
