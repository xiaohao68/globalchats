import { FC, useEffect, useId, useState } from "react";
import { RsvCardTitle } from "@/pages/right-side-view/components";
import { cn } from "@gc/lib/utils.ts";
import { Form } from "@gc/ui/components/form.tsx";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EProtocol,
  MainWebviewId,
  protocolOptions,
  resolveFingerprintUA,
  getUserAgentPresetOptions,
  matchUserAgentPresetKey,
} from "@gc/model";
import { userStore, useUserStore } from "@gc/store";
import { useShallow } from "zustand/react/shallow";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { useMutation } from "@tanstack/react-query";
import { sleep } from "@gc/utils";
import {
  RowInput,
  RowSelect,
  RowSelectWithCustom,
  RowSwitch,
  SidebarSubmitButton,
  SidebarTitle,
} from "./FingerprintStyle";
// import { webviewManger } from "@gc/webview"
import { consoleLoggingIntegration } from "@sentry/react";

const formSchema = z.object({
  isIndependent: z.boolean().default(false),
  ua: z.string().min(1, "请输入UA"),
});

type FormType = z.infer<typeof formSchema>;

export const FingerprintPage = ({ appId }: { appId: string }) => {
  const enableId = useId();
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      await sleep(300);
    },
  });

  const { globalFingerprint, currentAppConfig } = useUserStore(
    useShallow((store) => ({
      globalFingerprint: store.globalSetting.fingerprint,
      currentAppConfig: store.getThirdAppConfigById(appId),
    })),
  );

  const switchIsIndependent = (isIndependent: boolean) => {
    const ua = isIndependent
      ? currentAppConfig.fingerprint.ua
      : globalFingerprint?.ua;
    form.reset({
      isIndependent: isIndependent,
      ua: ua,
    });
    setCustomUA(matchUserAgentPresetKey(ua) ? "" : ua);
  };

  useEffect(() => {
    switchIsIndependent(currentAppConfig.fingerprint.isIndependent);
  }, [appId]);

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      ua: currentAppConfig.fingerprint.isIndependent
        ? currentAppConfig?.fingerprint?.ua ||
          currentAppConfig?.webviewOptions?.userAgent ||
          ""
        : globalFingerprint?.ua,
    },
  });

  const [customUA, setCustomUA] = useState<string>(
    currentAppConfig.fingerprint.isIndependent
      ? currentAppConfig?.fingerprint?.ua ||
          currentAppConfig?.webviewOptions?.userAgent ||
          ""
      : globalFingerprint?.ua || "",
  );

  function onSubmit(formData: FormType) {
    mutateAsync();
    if (formData.isIndependent) {
      currentAppConfig.fingerprint = formData;
      currentAppConfig.webviewOptions.userAgent = resolveFingerprintUA(
        formData.ua,
      );
      // 通知主进程持久化 app 指纹
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [MainWebviewId],
          type: EChannelMessageEventType.updateSettings,
          payload: {
            appId: appId,
            thirdAppConfig: currentAppConfig,
          },
        }),
      );
    } else {
      userStore.updateGlobalSetting({ fingerprint: formData });
      currentAppConfig.fingerprint.isIndependent = false;
      // 通知主进程持久化全局指纹及 app 标志位
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [MainWebviewId],
          type: EChannelMessageEventType.updateSettings,
          payload: {
            appId: appId,
            thirdAppConfig: currentAppConfig,
            globalSetting: userStore.globalSetting,
          },
        }),
      );
    }
    userStore.updateThirdAppList([currentAppConfig]);
  }
  return (
    <div className="flex h-full w-full flex-col">
      <SidebarTitle label="指纹" />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 px-6 pt-2"
        >
          <RowSwitch<FormType>
            name="isIndependent"
            control={form.control}
            onChange={(v) => {
              switchIsIndependent(v);
            }}
            label="独立模式"
          />
          <RowSelectWithCustom<FormType>
            name="ua"
            control={form.control}
            label="UA"
            options={getUserAgentPresetOptions().map((it) => ({
              label: it.label,
              value: String(it.value),
            }))}
            customOptionLabel="自定义"
            customValue={customUA}
            onCustomValueChange={setCustomUA}
            inputClassName="h-8"
          />

          <SidebarSubmitButton
            label="应用"
            isPending={isPending}
            disabled={isPending}
          />
        </form>
      </Form>
    </div>
  );
};
