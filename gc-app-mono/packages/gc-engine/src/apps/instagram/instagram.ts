import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { attachStyleSheet } from "@gc/utils";
import styles from "./styles.css?inline";
import { instagramSDK } from "./sdk";

class Instagram extends AbstractAppEngine {
  appSDK = instagramSDK;

  constructor() {
    super();
    attachStyleSheet(styles);
  }
}

export const instagram = new Instagram();
