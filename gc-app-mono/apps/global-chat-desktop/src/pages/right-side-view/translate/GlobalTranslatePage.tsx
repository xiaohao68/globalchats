import { FC, useMemo, useRef } from "react";
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
import { Label } from "@gc/ui/components/label.tsx";
import { Switch } from "@gc/ui/components/switch.tsx";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { apiTranslateModelList } from "@gc/api";
import { useUserStore } from "@gc/store";
import { globalSettingManager, translateFormSchema } from "@gc/webview";
import { SearchSelector, SwitchWithText } from "@gc/ui/custorm-components";
import { useShallow } from "zustand/react/shallow";
import { ITranslateConfig, LanguageCodes } from "@gc/model";
import { RefreshCcw } from "lucide-react";
import { triggerSubmitEvent } from "@gc/misc";
import { Button } from "@gc/ui/components/button.tsx";
import { i18nNext } from "@gc/i18n";

type FormType = z.infer<typeof translateFormSchema>;

export const GlobalTranslatePage: FC = () => {
  const formRef = useRef<HTMLFormElement>();
  const globalTranslateConfig = useUserStore(
    useShallow((store) => store.globalSetting.translate),
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: [apiTranslateModelList.name],
    queryFn: apiTranslateModelList,
  });

  const form = useForm<FormType>({
    resolver: zodResolver(translateFormSchema),
    defaultValues: {
      modelId: globalTranslateConfig?.modelId,
      isIndependent: globalTranslateConfig?.isIndependent,
      receiveMessageEnable: globalTranslateConfig?.receiveMessage.enable,
      receiveMessageSrcLang: globalTranslateConfig?.receiveMessage.from,
      receiveMessageDstLang: globalTranslateConfig?.receiveMessage.to,
      sendMessageEnable: globalTranslateConfig?.sendMessage.enable,
      sendMessageSrcLang: globalTranslateConfig?.sendMessage.from,
      sendMessageDstLang: globalTranslateConfig?.sendMessage.to,
    },
  });
  const watchedValues = form.watch();

  const langEntries = Object.entries(LanguageCodes).filter(([key]) => key !== "auto");
  const srcLangOptions = useMemo(() => [
    { value: LanguageCodes.auto, label: i18nNext.t("common:languages.auto") },
    ...langEntries.map(([, value]) => ({
      value,
      label: i18nNext.t(`common:languages.${value}`),
    })),
  ], []);
  const dstLangOptions = useMemo(() =>
    langEntries.map(([, value]) => ({
      value,
      label: i18nNext.t(`common:languages.${value}`),
    })),
  []);

  const onSubmit = (data: FormType) => {
    const translateConfig: ITranslateConfig = {
      modelId: data.modelId,
      isIndependent: data.isIndependent,
      receiveMessage: {
        enable: data.receiveMessageEnable,
        from: data.receiveMessageSrcLang,
        to: data.receiveMessageDstLang,
      },
      sendMessage: {
        enable: data.sendMessageEnable,
        from: data.sendMessageSrcLang,
        to: data.sendMessageDstLang,
      },
    };

    globalSettingManager.setTranslate(translateConfig);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <RsvCardTitle>
        <div
          className={cn(
            "flex items-center gap-1 text-base font-medium select-none",
          )}
        >
          <span>翻译配置</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={isFetching}
            onClick={() => refetch()}
            className="size-6"
          >
            <RefreshCcw className={cn(isFetching && "animate-spin-reverse")} />
          </Button>
        </div>
      </RsvCardTitle>

      {/*<div>{JSON.stringify(currentChatUserTranslateConfig || {})}</div>*/}
      <Form {...form}>
        <form
          //@ts-ignore
          ref={formRef}
          className="flex flex-col gap-6 px-6 pt-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
            <Label className="text-secondary-foreground w-14 text-sm font-normal">
              聊天用户
            </Label>
            <div>{"-"}</div>
          </div>

          {/* 用户独立翻译 */}
          <div>
            <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
              <FormField
                control={form.control}
                name="isIndependent"
                render={({ field }) => (
                  <FormItem className="text-primary-foreground flex items-center space-y-0 space-x-2 text-sm font-normal">
                    <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                      翻译设置
                    </FormLabel>

                    <SwitchWithText
                      value={field.value}
                      options={[{ value: false, label: "全局翻译" }]}
                    />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/*/!* 选择模型 *!/*/}
          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    翻译模型
                  </FormLabel>

                  <SearchSelector
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      triggerSubmitEvent(formRef.current);
                    }}
                    placeholder="请选择"
                    options={data?.modelList.map((it) => ({
                      value: it.id,
                      label: it.displayName,
                    }))}
                  />
                </div>
              </div>
            )}
          />

          <div className="grid grid-cols-1 grid-rows-[auto,auto,auto] gap-6 overflow-hidden rounded-xl bg-[#cedbec]/30 p-6">
            {/* 接收消息自动翻译 */}
            <div>
              <div className="flex items-center space-x-2 text-sm font-normal">
                <FormField
                  control={form.control}
                  name="receiveMessageEnable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-y-0 space-x-2 text-sm font-normal">
                      <FormControl>
                        <Switch
                          id={field.name}
                          className="data-[state=unchecked]:bg-muted-foreground cursor-pointer"
                          checked={field.value}
                          onCheckedChange={(value) => {
                            field.onChange(value);
                            triggerSubmitEvent(formRef.current);
                          }}
                        />
                      </FormControl>
                      <FormLabel htmlFor={field.name} className="mt-0">
                        接收翻译设置
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="receiveMessageSrcLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                      源语言
                    </FormLabel>

                    <FormControl>
                      <SearchSelector
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          triggerSubmitEvent(formRef.current);
                        }}
                        placeholder="请选择"
                        options={srcLangOptions}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiveMessageDstLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                      目标语言
                    </FormLabel>
                    <FormControl>
                      <SearchSelector
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          triggerSubmitEvent(formRef.current);
                        }}
                        placeholder="请选择"
                        options={dstLangOptions}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full">
            <div className="grid grid-cols-1 grid-rows-[auto,auto,auto] gap-6 overflow-hidden rounded-xl bg-[#cedbec]/30 p-6">
              <div>
                <div className="flex items-center space-x-2 text-sm">
                  <FormField
                    control={form.control}
                    name="sendMessageEnable"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-y-0 space-x-2 text-sm">
                        <FormControl>
                          <Switch
                            id={field.name}
                            className="data-[state=unchecked]:bg-muted-foreground cursor-pointer"
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              triggerSubmitEvent(formRef.current);
                            }}
                          />
                        </FormControl>
                        <FormLabel htmlFor={field.name} className="mt-0">
                          发送翻译设置
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="sendMessageSrcLang"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                      <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                        源语言
                      </FormLabel>
                      <FormControl>
                        <SearchSelector
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            triggerSubmitEvent(formRef.current);
                          }}
                          placeholder="请选择"
                          options={srcLangOptions}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sendMessageDstLang"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                      <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                        目标语言
                      </FormLabel>
                      <FormControl>
                        <SearchSelector
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            triggerSubmitEvent(formRef.current);
                          }}
                          placeholder="请选择"
                          options={dstLangOptions}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
