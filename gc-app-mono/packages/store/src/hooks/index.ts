import { useAppStore } from "../appStore.ts";
import { useShallow } from "zustand/react/shallow";

export const useCurrentApp = () => {
  const { currentApp, currentAppId, appList } = useAppStore(
    useShallow((store) => ({
      currentApp: store.getCurrentApp(),
      currentAppId: store.currentAppId,
      appList: store.appList,
    })),
  );
  return { currentApp, currentAppId, appList };
};
