import { FC, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gc/ui/components/dialog";
import { Button } from "@gc/ui/components/button";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { ProxySection } from "./ProxySection";
import { FingerprintSection } from "./FingerprintSection";
import { webviewManger } from "@gc/webview";
import { useNavigate } from "react-router";
import { ERouterPath } from "@gc/model";
import { Separator } from "@gc/ui/components/separator";
import { PlatformIcon } from "@/components/icons";
import { userStore } from "@gc/store";
import { Loader2 } from "lucide-react";

export const SessionConfigDialog: FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isOpen,
    mode,
    editingAppId,
    selectedPlatform,
    proxyConfig,
    fingerprintConfig,
    close,
    cancel,
  } = useSessionConfigStore();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "create" && selectedPlatform) {
        const app = await webviewManger.create(selectedPlatform, "", {
          proxy: proxyConfig
            ? {
                isIndependent: true,
                enable: true,
                proxyId: proxyConfig.proxyId,
                protocol: proxyConfig.protocol,
                host: proxyConfig.host,
                port: proxyConfig.port,
              }
            : undefined,
          fingerprint: fingerprintConfig,
        });

        if (app) {
          navigate(`${ERouterPath.singleChat}/${app.id}`);
        }
      } else if (mode === "edit" && editingAppId) {
        const appConfig = userStore.getThirdAppConfigById(editingAppId);
        if (appConfig) {
          if (proxyConfig) {
            appConfig.proxy = {
              isIndependent: true,
              enable: true,
              proxyId: proxyConfig.proxyId,
              protocol: proxyConfig.protocol,
              host: proxyConfig.host,
              port: proxyConfig.port,
            };
          } else {
            appConfig.proxy = {
              ...appConfig.proxy,
              enable: false,
            };
          }
          appConfig.fingerprint = fingerprintConfig;
          userStore.updateThirdAppList([appConfig]);

          await webviewManger.reload(editingAppId);
        }
      }

      close();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await cancel();
  };

  const title =
    mode === "create"
      ? `新建会话 - ${selectedPlatform || ""}`
      : "编辑会话配置";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="flex max-w-md flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedPlatform && (
              <PlatformIcon platform={selectedPlatform} size={20} />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full space-y-6 overflow-hidden py-4">
          <ProxySection />

          <Separator />

          <FingerprintSection />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "创建会话" : "保存并重启"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
