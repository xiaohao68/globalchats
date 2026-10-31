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
  getUserAgentPresetOptions,
  resolveFingerprintUA,
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

const formSchema = z.object({
  ua: z.string().min(1, "请输入UA"),
});

type FormType = z.infer<typeof formSchema>;

export const GlobalFingerprintPage: FC = () => {
  const enableId = useId();
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      await sleep(300);
    },
  });

  const { fingerprint } = useUserStore(
    useShallow((store) => ({
      fingerprint: store.globalSetting.fingerprint,
    })),
  );

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      ua: fingerprint?.ua || "",
    },
  });

  const [customUA, setCustomUA] = useState<string>(fingerprint?.ua || "");

  useEffect(() => {
    setCustomUA(
      matchUserAgentPresetKey(fingerprint?.ua) ? "" : fingerprint?.ua,
    );
  }, []);

  function onSubmit(formData: FormType) {
    mutateAsync();
    userStore.updateGlobalSetting({
      fingerprint: { ...fingerprint, ...formData },
    });
    // 通知主进程持久化全局指纹
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.updateSettings,
        payload: {
          globalSetting: userStore.globalSetting,
        },
      }),
    );
  }
  return (
    <div className="flex h-full w-full flex-col">
      <SidebarTitle label="指纹" />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 px-6 pt-2"
        >
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
