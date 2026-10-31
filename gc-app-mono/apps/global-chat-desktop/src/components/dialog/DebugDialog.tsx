import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gc/ui/components/dialog";
import { DialogTrigger } from "@gc/ui/components/dialog.tsx";
import { Button } from "@gc/ui/components/button.tsx";
import { Wrench } from "lucide-react";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import {
  globalStore,
  useAppStore,
  useGlobalStore,
  userStore,
  useUserStore,
} from "@gc/store";
import { useShallow } from "zustand/react/shallow";

export function DebugDialog() {
  const globalState = useGlobalStore(
    useShallow((state) => ({
      userConfigList: state.userConfigList,
      globalSetting: state.globalSetting,
      currentSignInUserId: state.currentSignInUserId,
      isReady: state.isReady,
    })),
  );

  const userSate = useUserStore(
    useShallow((state) => ({
      userInfo: state.userInfo,
      globalSetting: state.globalSetting,
      thirdAppConfigList: state.thirdAppConfigList,
    })),
  );

  const appState = useAppStore(
    useShallow((state) => ({
      appList: state.appList,
      currentAppId: state.currentAppId,
      currentSideWebviewPath: state.currentSideWebviewPath,
    })),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Wrench strokeWidth="1.3" className="size-5"></Wrench>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-10/12 w-[1200px] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>Debug 页面</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <h5>globalState</h5>
          <div className="max-h-[400px] overflow-scroll">
            <JsonView
              theme="vscode"
              src={globalState}
              collapsed={false}
              editable={{
                add: true,
                edit: true,
                delete: true,
              }}
              onEdit={({ src }) => {
                globalStore.updateGlobalStore(src);
              }}
              onDelete={({ src }) => {
                globalStore.updateGlobalStore(src);
              }}
              onAdd={({ src }) => {
                globalStore.updateGlobalStore(src);
              }}
              enableClipboard
            />
          </div>
          <div className="grid gap-3">
            <h5>userStore</h5>
            <div className="max-h-[400px] overflow-scroll">
              <JsonView
                theme="vscode"
                src={userSate}
                collapsed={false}
                editable={{
                  add: false,
                  edit: true,
                  delete: false,
                }}
                onEdit={({ src }) => {
                  // @ts-ignore
                  userStore.setUserStore(src);
                  userStore.syncPersistCache();
                }}
                enableClipboard
              />
            </div>
          </div>
          <div className="grid gap-3">
            <h5>appState</h5>
            <div className="max-h-[400px] overflow-scroll">
              <JsonView
                theme="vscode"
                src={appState}
                collapsed={false}
                enableClipboard
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
