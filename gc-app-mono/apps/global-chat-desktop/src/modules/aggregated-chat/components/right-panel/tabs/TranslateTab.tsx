import { useMemo, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { Switch } from "@gc/ui/components/switch";
import { Button } from "@gc/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@gc/ui/components/form";
import { SearchSelector } from "@gc/ui/custorm-components";
import { cn } from "@gc/ui/lib/utils";
import { apiTranslateModelList } from "@gc/api";
import { useUserStore } from "@gc/store";
import { translateFormSchema, globalSettingManager } from "@gc/webview";
import { useShallow } from "zustand/react/shallow";
import { triggerSubmitEvent } from "@gc/misc";
import { LanguageCodes } from "@gc/model";
import type { ITranslateConfig } from "@gc/model";
import type { Nullable } from "@gc/utils";
import { i18nNext } from "@gc/i18n";

type FormType = z.infer<typeof translateFormSchema>;

export function TranslateTab() {
  const formRef = useRef<HTMLFormElement>(null);
  const globalTranslateConfig = useUserStore(
    useShallow((store) => store.globalSetting.translate)
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: [apiTranslateModelList.name],
    queryFn: apiTranslateModelList,
  });

  const form = useForm<FormType>({
    resolver: zodResolver(translateFormSchema),
    defaultValues: {
      modelId: globalTranslateConfig?.modelId,
      isIndependent: false,
      receiveMessageEnable: globalTranslateConfig?.receiveMessage.enable,
      receiveMessageSrcLang: globalTranslateConfig?.receiveMessage.from,
      receiveMessageDstLang: globalTranslateConfig?.receiveMessage.to,
      sendMessageEnable: globalTranslateConfig?.sendMessage.enable,
      sendMessageSrcLang: globalTranslateConfig?.sendMessage.from,
      sendMessageDstLang: globalTranslateConfig?.sendMessage.to,
    },
  });
  const watchedValues = form.watch();

  const resetForm = useCallback(
    (translateConfig: Nullable<ITranslateConfig>) => {
      form.reset({
        isIndependent: translateConfig?.isIndependent ?? false,
        modelId: translateConfig?.modelId ?? "",
        receiveMessageEnable: translateConfig?.receiveMessage.enable ?? false,
        receiveMessageSrcLang: translateConfig?.receiveMessage.from ?? "",
        receiveMessageDstLang: translateConfig?.receiveMessage.to ?? "",
        sendMessageEnable: translateConfig?.sendMessage.enable ?? false,
        sendMessageSrcLang: translateConfig?.sendMessage.from ?? "",
        sendMessageDstLang: translateConfig?.sendMessage.to ?? "",
      });
    },
    [form]
  );

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

  const onSubmit = (formData: FormType) => {
    const translateConfig: ITranslateConfig = {
      modelId: formData.modelId,
      isIndependent: false,
      receiveMessage: {
        enable: formData.receiveMessageEnable,
        from: formData.receiveMessageSrcLang,
        to: formData.receiveMessageDstLang,
      },
      sendMessage: {
        enable: formData.sendMessageEnable,
        from: formData.sendMessageSrcLang,
        to: formData.sendMessageDstLang,
      },
    };
    globalSettingManager.setTranslate(translateConfig);
  };

  useEffect(() => {
    resetForm(globalTranslateConfig);
  }, [globalTranslateConfig, resetForm]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          翻译配置
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={isFetching}
          onClick={() => refetch()}
          className="size-6"
        >
          <RefreshCcw
            className={cn("h-4 w-4", isFetching && "animate-spin-reverse")}
          />
        </Button>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* 翻译模型 */}
          <FormField
            control={form.control}
            name="modelId"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                  <FormLabel className="w-14 text-sm font-normal text-[var(--color-text-secondary)]">
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
              </FormItem>
            )}
          />

          {/* 接收消息翻译设置 */}
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#cedbec]/30 p-4">
            <FormField
              control={form.control}
              name="receiveMessageEnable"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
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
                  <FormLabel
                    htmlFor={field.name}
                    className="mt-0 text-sm font-normal"
                  >
                    接收翻译
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiveMessageSrcLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <FormLabel className="w-14 text-sm font-normal text-[var(--color-text-secondary)]">
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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiveMessageDstLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <FormLabel className="w-14 text-sm font-normal text-[var(--color-text-secondary)]">
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
                </FormItem>
              )}
            />
          </div>

          {/* 发送消息翻译设置 */}
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#cedbec]/30 p-4">
            <FormField
              control={form.control}
              name="sendMessageEnable"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
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
                  <FormLabel
                    htmlFor={field.name}
                    className="mt-0 text-sm font-normal"
                  >
                    发送翻译
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendMessageSrcLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <FormLabel className="w-14 text-sm font-normal text-[var(--color-text-secondary)]">
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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendMessageDstLang"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <FormLabel className="w-14 text-sm font-normal text-[var(--color-text-secondary)]">
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
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
