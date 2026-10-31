import { IGlobalStore, makeEmptyGlobalStore } from "@gc/model";

const upgradeTo1_5 = (persistedState: IGlobalStore) => {
  // 兼容老版本数据，移除激活码相关字段，只保留邮件登录数据
  if (persistedState?.globalSetting?.signState) {
    const oldSignState = persistedState.globalSetting.signState;
    // 如果是激活码类型，清空数据；如果是邮件类型，保留邮件和密码
    // @ts-ignore
    if (oldSignState.type === "activationCode") {
      persistedState.globalSetting.signState = {
        keepSign: oldSignState.keepSign || true,
        email: "",
        password: "",
      };
    } else {
      persistedState.globalSetting.signState = {
        keepSign: oldSignState.keepSign || true,
        email: oldSignState.email || "",
        password: oldSignState.password || "",
      };
    }
    // 删除不需要的字段
    // @ts-ignore
    delete persistedState.globalSetting.signState.type;
    // @ts-ignore
    delete persistedState.globalSetting.signState.activationCode;
  }

  // 迁移用户配置列表中的 signState
  if (persistedState?.userConfigList) {
    Object.values(persistedState.userConfigList).forEach((userConfig: any) => {
      if (userConfig?.globalSetting?.signState) {
        const oldSignState = userConfig.globalSetting.signState;
        if (oldSignState.type === "activationCode") {
          userConfig.globalSetting.signState = {
            keepSign: oldSignState.keepSign || true,
            email: "",
            password: "",
          };
        } else {
          userConfig.globalSetting.signState = {
            keepSign: oldSignState.keepSign || true,
            email: oldSignState.email || "",
            password: oldSignState.password || "",
          };
        }
        delete userConfig.globalSetting.signState.type;
        delete userConfig.globalSetting.signState.activationCode;
      }
    });
  }
  console.log("迁移完成：已从v1升级到v2，移除激活码登录，仅保留邮件登录");
  return persistedState;
};

// 兼容默认值和已存储值的处理
export const mergeStoredWithDefaults = (
  persistedState: IGlobalStore,
): IGlobalStore => {
  const defaultGlobalStoreState = makeEmptyGlobalStore();

  defaultGlobalStoreState.userConfigList = persistedState.userConfigList;
  defaultGlobalStoreState.globalSetting.proxy =
    persistedState.globalSetting.proxy ||
    defaultGlobalStoreState.globalSetting.proxy;
  defaultGlobalStoreState.globalSetting.i18n =
    persistedState.globalSetting.i18n ||
    defaultGlobalStoreState.globalSetting.i18n;
  defaultGlobalStoreState.globalSetting.signState =
    persistedState.globalSetting.signState ||
    defaultGlobalStoreState.globalSetting.signState;
  defaultGlobalStoreState.globalSetting.theme =
    persistedState.globalSetting.theme ||
    defaultGlobalStoreState.globalSetting.theme;
  defaultGlobalStoreState.globalSetting.translate =
    persistedState.globalSetting.translate ||
    defaultGlobalStoreState.globalSetting.translate;

  defaultGlobalStoreState.currentSignInUserId =
    persistedState.currentSignInUserId;

  return defaultGlobalStoreState;
};

export const migrateStore = (persistedState: IGlobalStore, version: number) => {
  const mergedState = mergeStoredWithDefaults(persistedState);

  if (version < 1.5) {
    upgradeTo1_5(mergedState);
  }
  return mergedState;
};
