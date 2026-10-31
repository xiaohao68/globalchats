import { Store } from "@tauri-apps/plugin-store";
import { StateStorage } from "zustand/middleware/persist";
import { isEmpty } from "lodash-es";
import { AbstractLifeCycle } from "@gc/misc";
import { Nullable } from "@gc/utils";

export let settingStorage: Nullable<Store>;

class PersistGlobalStorage implements StateStorage, AbstractLifeCycle {
  async mount() {
    settingStorage = await Store.load("settings.json");
  }

  destroy() {}

  async getItem(name: string) {
    try {
      const value = await settingStorage?.get(name);
      if (isEmpty(value)) {
        return null;
      }
      return JSON.stringify(value);
    } catch (error: any) {
      return null;
    }
  }

  async setItem(name: string, value: string) {
    try {
      await settingStorage?.set(name, JSON.parse(value));
      await settingStorage?.save();
    } catch (error: any) {
      console.error("Error setting item:", error);
    }
  }

  async removeItem(name: string) {
    try {
      await settingStorage?.delete(name);
    } catch (error: any) {
      console.error("Error removing item:", error);
    }
  }
}

export const persistGlobalStorage = new PersistGlobalStorage();
