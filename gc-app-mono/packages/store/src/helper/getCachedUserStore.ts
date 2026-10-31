import { makeEmptyUserConfig } from "@gc/model";
import { globalStore } from "../globalStore.ts";
import { isEmpty } from "lodash-es";

export const getCachedUserStore = () => {
  const currentSignInUserConfig = globalStore.getCurrentSignInUserConfig();
  if (!isEmpty(currentSignInUserConfig)) {
    return currentSignInUserConfig;
  }
  return makeEmptyUserConfig();
};
