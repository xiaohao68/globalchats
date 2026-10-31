import { FC, useState } from "react";
import { Label } from "@gc/ui/components/label";
import { Input } from "@gc/ui/components/input";
import { Switch } from "@gc/ui/components/switch";
import { SearchSelector } from "@gc/ui/custorm-components";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { EProtocol, protocolOptions } from "@gc/model";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@gc/ui/components/button";

export const ProxySection: FC = () => {
  const { proxyConfig, setProxyConfig } = useSessionConfigStore();
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const enabled = proxyConfig !== null;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setProxyConfig({
        proxyId: "",
        protocol: EProtocol.http,
        host: "",
        port: "",
      });
    } else {
      setProxyConfig(null);
      setTestStatus("idle");
    }
  };

  const handleTestProxy = async () => {
    if (!proxyConfig?.host || !proxyConfig?.port) return;

    setTestStatus("testing");
    try {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      const proxyUrl = `${proxyConfig.protocol.toLowerCase()}://${proxyConfig.host}:${proxyConfig.port}`;
      const response = await tauriFetch("https://httpbin.org/ip", {
        connectTimeout: 10000,
        proxy: {
          all: proxyUrl,
        },
      });

      if (response.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("failed");
      }
    } catch {
      setTestStatus("failed");
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">网络代理</h4>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">协议</Label>
            <SearchSelector
              value={proxyConfig.protocol}
              onChange={(value) => {
                setProxyConfig({ ...proxyConfig, protocol: value as EProtocol });
              }}
              placeholder="请选择协议"
              options={protocolOptions}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">地址</Label>
            <div className="flex items-center gap-2">
              <Input
                value={proxyConfig.host}
                onChange={(e) => {
                  setProxyConfig({ ...proxyConfig, host: e.target.value });
                }}
                placeholder="IP 或域名"
                className="h-8 flex-1 min-w-0"
              />
              <span className="text-muted-foreground shrink-0">:</span>
              <Input
                value={proxyConfig.port}
                onChange={(e) => {
                  setProxyConfig({ ...proxyConfig, port: e.target.value });
                }}
                placeholder="端口"
                className="h-8 w-20 shrink-0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleTestProxy}
              disabled={testStatus === "testing" || !proxyConfig.host || !proxyConfig.port}
            >
              {testStatus === "testing" && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              测试连接
            </Button>
            {testStatus === "success" && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={14} />
                连接成功
              </span>
            )}
            {testStatus === "failed" && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <XCircle size={14} />
                连接失败
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
