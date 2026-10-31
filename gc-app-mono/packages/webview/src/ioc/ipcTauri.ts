import { invoke } from "@tauri-apps/api/core";
import { ETheme, IWebviewOptions } from "@gc/model";

interface CommandArgs {
  create_webview: {
    options: IWebviewOptions;
  };
  remove_webview: {
    webviewId: string;
  };
  update_webview: {
    options: Partial<IWebviewOptions>;
  };
  reload_webview: {
    options: IWebviewOptions;
  };
  open_webview: {
    options: IWebviewOptions;
  };
  show_webview: {
    webviewId: string;
  };
  hide_webview: {
    webviewId: string;
  };
  close_webview: {
    webviewId: string;
  };
  open_devtools: {
    webviewId: string;
  };
  close_devtools: {
    webviewId: string;
  };
  toggle_devtools: {
    webviewId: string;
  };

  //-------------------------------------------------------------------------------------
  // side webview
  //-------------------------------------------------------------------------------------
  show_side_webview: undefined;
  hide_side_webview: undefined;
  resize_side_webview: {
    layout: IWebviewOptions;
  };
  // toggle_side_webview: undefined;
  // create_side_webview: undefined;
  // close_side_webview: undefined;

  //-------------------------------------------------------------------------------------
  // theme
  //-------------------------------------------------------------------------------------
  set_theme: {
    theme: ETheme;
  };

  //-------------------------------------------------------------------------------------
  // store
  //-------------------------------------------------------------------------------------
}

interface CommandReturns {
  create_webview: void;
  remove_webview: void;
  update_webview: void;
  reload_webview: void;
  open_webview: void;
  show_webview: void;
  hide_webview: void;
  close_webview: void;
  open_devtools: void;
  close_devtools: void;
  toggle_devtools: void;

  // side webview
  show_side_webview: void;
  hide_side_webview: void;
  resize_side_webview: void;
  // create_side_webview: void;
  // toggle_side_webview: void;
  // close_side_webview: void;

  // theme
  set_theme: void;
}

class IPCTauri {
  invoke<K extends keyof CommandArgs>(
    cmd: K,
    args?: CommandArgs[K],
  ): Promise<CommandReturns[K]> {
    return invoke<CommandReturns[K]>(cmd, args);
  }
}

export const ipcTauri = new IPCTauri();
