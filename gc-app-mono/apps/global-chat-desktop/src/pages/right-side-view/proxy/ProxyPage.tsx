import { FC, useEffect, useId } from "react";
import { RsvCardTitle } from "@/pages/right-side-view/components";
import { cn } from "@gc/lib/utils.ts";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@gc/ui/components/form.tsx";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchSelector, SwitchWithText } from "@gc/ui/custorm-components";
import { EProtocol, MainWebviewId, protocolOptions } from "@gc/model";
import { Input } from "@gc/ui/components/input.tsx";
import { isEmpty } from "lodash-es";
import { userStore, useUserStore } from "@gc/store";
import { useShallow } from "zustand/react/shallow";
import { Switch } from "@gc/ui/components/switch.tsx";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { Button } from "@gc/ui/components/button.tsx";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { sleep } from "@gc/utils";

const formSchema = z.discriminatedUnion("enable", [
  z.object({
    enable: z.literal(true),
    isIndependent: z.boolean(),
    proxyId: z.string().trim(),
    autofill: z.string().trim().optional(),
    protocol: z.nativeEnum(EProtocol),
    host: z.string().trim().min(1, "请输入IP或者域名"),
    port: z.string().trim().min(1, "请输入端口"),
    username: z.string().trim().optional(),
    password: z.string().trim().optional(),
  }),
  z.object({
    enable: z.literal(false),
    isIndependent: z.boolean(),
    proxyId: z.string().trim(),
    autofill: z.string().trim().optional(),
    protocol: z.nativeEnum(EProtocol).optional(),
    host: z.string().trim().optional(),
    port: z.string().trim().optional(),
    username: z.string().trim().optional(),
    password: z.string().trim().optional(),
  }),
]);

type FormType = z.infer<typeof formSchema>;

interface Props {
  appId: string;
}

export const ProxyPage: FC<Props> = ({ appId }) => {
  const enableId = useId();
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      await sleep(300);
    },
  });

  const { proxy, currentAppConfig } = useUserStore(
    useShallow((store) => ({
      proxy: store.getValidThirdAppProxyConfigById(appId),
      currentAppConfig: store.getThirdAppConfigById(appId),
    })),
  );

  // const { data, refetch, isFetching } = useQuery({
  //   queryKey: [apiProxyList.name],
  //   queryFn: apiProxyList,
  // });

  // const proxyListOptions = useMemo(() => {
  //   return (
  //     data?.map((it) => ({
  //       value: it.id,
  //       label: it.name,
  //     })) || []
  //   );
  // }, [data]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      isIndependent: proxy.isIndependent,
      enable: proxy.enable,
      proxyId: proxy.proxyId,
      autofill: "",
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    },
  });

  const watchedValues = form.watch();

  const switchIsIndependent = (isIndependent: boolean) => {
    const proxy = userStore.getValidThirdAppProxyConfigById(
      appId,
      isIndependent,
    );

    form.reset({
      isIndependent: isIndependent,
      enable: proxy.enable,
      proxyId: proxy.proxyId,
      autofill: "",
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    });
  };

  useEffect(() => {
    switchIsIndependent(proxy.isIndependent);
  }, [appId]);

  // const onSelectProxyId = (proxyId: string) => {
  //   if (isEmpty(proxyId)) {
  //     return;
  //   }
  //   const selectedProxy = data?.find((it) => {
  //     return it.id === proxyId;
  //   });
  //   if (isEmpty(selectedProxy)) {
  //     return;
  //   }
  //
  //   form.setValue("protocol", selectedProxy.protocol);
  //   form.setValue("host", selectedProxy.host);
  //   form.setValue("port", selectedProxy.port);
  //   form.setValue("username", selectedProxy.username);
  //   form.setValue("password", selectedProxy.password);
  // };

  function onSubmit(formData: FormType) {
    mutateAsync();

    if (formData.isIndependent) {
      currentAppConfig.proxy = {
        isIndependent: formData.isIndependent,
        enable: formData.enable,
        proxyId: formData.proxyId,
        protocol: formData.protocol!,
        host: formData.host!,
        port: formData.port!,
        username: formData.username,
        password: formData.password,
      };
      userStore.updateThirdAppList([currentAppConfig]);

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
      userStore.updateGlobalSetting({
        proxy: {
          isIndependent: false,
          enable: formData.enable,
          proxyId: formData.proxyId,
          protocol: formData.protocol!,
          host: formData.host!,
          port: formData.port!,
          username: formData.username,
          password: formData.password,
        },
      });
      currentAppConfig.proxy.isIndependent = formData.isIndependent;
      userStore.updateThirdAppList([currentAppConfig]);

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
  }

  return (
    <div className="flex h-full w-full flex-col">
      <RsvCardTitle>
        <div className={cn("text-base font-medium text-[var(--gc-text-primary)] select-none")}>
          网络代理
          {/*<GcButton*/}
          {/*  variant="ghost"*/}
          {/*  size="icon"*/}
          {/*  disabled={isFetching}*/}
          {/*  onClick={() => refetch()}*/}
          {/*>*/}
          {/*  <RefreshCcw className={cn(isFetching && "animate-spin-reverse")} />*/}
          {/*</GcButton>*/}
        </div>
      </RsvCardTitle>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 px-6 pt-2"
        >
          {/* 用户独立翻译 */}
          <div>
            <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
              <FormField
                control={form.control}
                name="isIndependent"
                render={({ field }) => (
                  <FormItem className="text-primary-foreground flex items-center space-y-0 space-x-2 text-sm font-normal">
                    <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                      代理设置
                    </FormLabel>

                    <SwitchWithText
                      value={field.value}
                      onChange={(value) => {
                        switchIsIndependent(value as boolean);
                      }}
                      options={[
                        { value: true, label: "独立代理" },
                        { value: false, label: "全局代理" },
                      ]}
                    />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/* 是否开启 */}
          <div>
            <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
              <FormField
                control={form.control}
                name="enable"
                render={({ field }) => (
                  <FormItem className="text-primary-foreground flex items-center space-y-0 space-x-2 text-sm font-normal">
                    <FormLabel
                      htmlFor={enableId}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      启用
                    </FormLabel>
                    <FormControl>
                      <Switch
                        id={enableId}
                        className="data-[state=unchecked]:bg-muted-foreground cursor-pointer"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
          {watchedValues.enable && (
            <>
              {/* 选择代理 */}
              {/*<FormField*/}
              {/*  control={form.control}*/}
              {/*  name="proxyId"*/}
              {/*  render={({ field }) => (*/}
              {/*    <div className="space-y-2">*/}
              {/*      <div className="grid grid-rows-1 grid-cols-[auto_1fr] gap-4 items-center">*/}
              {/*        <FormLabel className="w-14 text-sm text-secondary-foreground font-normal">*/}
              {/*          选择代理*/}
              {/*        </FormLabel>*/}

              {/*        <SearchSelector*/}
              {/*          value={field.value}*/}
              {/*          onChange={(value) => {*/}
              {/*            onSelectProxyId(value);*/}
              {/*            field.onChange(value);*/}
              {/*          }}*/}
              {/*          placeholder="请选择"*/}
              {/*          options={proxyListOptions}*/}
              {/*        />*/}
              {/*        <FormMessage />*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*  )}*/}
              {/*/>*/}
              {/*<FormField*/}
              {/*  control={form.control}*/}
              {/*  name="autofill"*/}
              {/*  render={({ field }) => (*/}
              {/*    <div className="space-y-2">*/}
              {/*      <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">*/}
              {/*        <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">*/}
              {/*          智能填写*/}
              {/*        </FormLabel>*/}

              {/*        <FormControl>*/}
              {/*          <Input*/}
              {/*            className="h-8 bg-white text-sm"*/}
              {/*            value={field.value}*/}
              {/*            onChange={field.onChange}*/}
              {/*            placeholder="socks://127.0.0.1:7890"*/}
              {/*            disabled={!isEmpty(watchedValues.proxyId)}*/}
              {/*          />*/}
              {/*        </FormControl>*/}
              {/*        <FormMessage />*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*  )}*/}
              {/*/>*/}
              {/* 协议 */}
              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                      <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                        网络协议
                      </FormLabel>

                      <SearchSelector
                        // @ts-ignore
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="请选择"
                        options={protocolOptions}
                        disabled={!isEmpty(watchedValues.proxyId)}
                      />
                      <FormMessage />
                    </div>
                  </div>
                )}
              />
              <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                  IP端口
                </FormLabel>
                <div className="grid grid-cols-[1fr_auto_auto] grid-rows-1 items-center gap-1">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <>
                        <Input
                          className="h-8 bg-[var(--gc-surface-1)] border-[var(--gc-border-1)] text-[var(--gc-text-primary)] text-sm"
                          {...field}
                          placeholder="IP"
                          disabled={!isEmpty(watchedValues.proxyId)}
                        />
                        <FormMessage />
                      </>
                    )}
                  />
                  <span>:</span>
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <>
                        <Input
                          className="h-8 w-20 bg-white text-sm"
                          pattern="\d*"
                          inputMode="numeric"
                          {...field}
                          placeholder="端口"
                          disabled={!isEmpty(watchedValues.proxyId)}
                        />
                        <FormMessage />
                      </>
                    )}
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex items-center justify-end gap-2">
            {/*<Button*/}
            {/*  disabled={!isEmpty(watchedValues.proxyId)}*/}
            {/*  variant="secondary"*/}
            {/*>*/}
            {/*{isFetching && <IconLoading />}*/}
            {/*检测*/}
            {/*</Button>*/}
            {/*<GcButton disabled={isFetching} type="submit">*/}
            <Button variant="default" type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              应用
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
