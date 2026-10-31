import { reduce } from "lodash-es";
import { userStore } from "../userStore.ts";
import { AppState, makeDefaultAppState } from "@gc/model";

export const getAppListFromUserStore = () => {
  return reduce(
    userStore.thirdAppConfigList,
    (acc, appConfig) => {
      acc[appConfig.id] = makeDefaultAppState(appConfig);
      return acc;
    },
    {} as Record<string, AppState>,
  );
};
