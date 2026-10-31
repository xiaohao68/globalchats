import { FC, useCallback, useEffect, useRef } from "react";
import { RsvCardTitle } from "@/pages/right-side-view/components";
import { cn } from "@gc/lib/utils.ts";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@gc/ui/components/form.tsx";
import { Label } from "@gc/ui/components/label.tsx";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@gc/store";
import { GcButton } from "@gc/ui/custorm-components";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@gc/ui/components/input.tsx";
import { Textarea } from "@gc/ui/components/textarea.tsx";

const formSchema = z.object({
  //-------------------------------------------------------------------------------------
  // contact info
  //-------------------------------------------------------------------------------------
  userId: z.string().trim().min(1),
  nickname: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  birthday: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  remark: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  //-------------------------------------------------------------------------------------
  // sales info
  //-------------------------------------------------------------------------------------
  value: z.string().trim().optional(), // 客户价值
  stage: z.string().trim().optional(), // 销售阶段
  source: z.string().trim().optional(), // 社媒来源
  //-------------------------------------------------------------------------------------
  // company info
  //-------------------------------------------------------------------------------------
  companyName: z.string().trim().optional(),
  companyPosition: z.string().trim().optional(),
  companyWebsite: z.string().trim().optional(),
  companyEmployees: z.string().trim().optional(),
  companyPhone: z.string().trim().optional(),
  companyEmail: z.string().trim().optional(),
  companyAddress: z.string().trim().optional(),
});
type FormType = z.infer<typeof formSchema>;

interface Props {
  appId: string;
}

export const CustomerPortrait: FC<Props> = ({ appId }) => {
  const formRef = useRef<HTMLFormElement>();

  const { currentChatUser, currentApp } = useAppStore(
    useShallow((store) => {
      return {
        currentApp: store.getAppById(appId),
        currentChatUser: store.getCurrentChatUserByAppId(appId),
      };
    }),
  );
  // const getCurrentChatUserTranslateConfigByAppId =  useAppStore((store) => store.getCurrentChatUserTranslateConfigByAppId);

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      //-------------------------------------------------------------------------------------
      // contact info
      //-------------------------------------------------------------------------------------
      userId: "",
      nickname: currentChatUser?.nickname,
      phone: currentChatUser?.phone || "",
      address: "",
      birthday: "",
      gender: "",
      remark: "",
      country: "",
      tag: "",
      //-------------------------------------------------------------------------------------
      // sales info
      //-------------------------------------------------------------------------------------
      value: "",
      stage: "",
      source: "",
      //-------------------------------------------------------------------------------------
      // company info
      //-------------------------------------------------------------------------------------
      companyName: "",
      companyPosition: "",
      companyWebsite: "",
      companyEmployees: "",
      companyPhone: "",
      companyEmail: "",
      companyAddress: "",
    },
  });
  const watchedValues = form.watch();

  const resetForm = useCallback(
    // (translateConfig: Nullable<ITranslateConfig>) => {
    //   form.reset({});
    // },
    [form],
  );

  const onSubmit = (data: FormType) => {};

  useEffect(() => {
    if (!currentChatUser) {
      // switchIndependent(globalTranslateConfig.isIndependent);
      return;
    }
    form.setValue("userId", currentChatUser.id);
    form.setValue("nickname", currentChatUser.nickname);
    form.setValue("phone", currentChatUser.phone);
    // switchIndependent(currentChatUserTranslateConfig?.isIndependent || false);
  }, [currentChatUser]);

  return (
    <div className="flex w-full flex-col pb-32">
      <RsvCardTitle>
        <div className={cn("text-base font-medium text-[#151b26] select-none")}>
          客户关系-开发中
        </div>
      </RsvCardTitle>

      <Form {...form}>
        <form
          //@ts-ignore
          ref={formRef}
          className="flex flex-col gap-2 px-6 pt-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
            <Label className="text-secondary-foreground w-14 text-sm font-normal">
              客户昵称
            </Label>
            <div>{currentApp?.currentChatUser?.nickname || "-"}</div>
          </div>

          {/* 用户独立翻译 */}
          <h4>联系人信息</h4>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      电话
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="电话"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      地址
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="地址"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      生日
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="电话"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      性别
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="电话"
                      />
                    </FormControl>
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      备注
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        id={field.name}
                        className="h-8 w-full bg-white text-sm"
                        {...field}
                        placeholder="备注"
                        maxLength={100}
                      />
                    </FormControl>
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      国家
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="国家"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      客户标签
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="客户标签"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <h4>销售信息</h4>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      客户价值
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="客户价值"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      销售阶段
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="销售阶段"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      社媒来源
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="社媒来源"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <h4>公司信息</h4>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      公司名称
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="公司名称"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      公司名称
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="公司名称"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyPosition"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      职位
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="职位"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyWebsite"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      网站
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="网站"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyEmployees"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      规模
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="规模"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyPhone"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      电话
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="电话"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyEmail"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      邮箱
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="邮箱"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="text-primary-foreground flex items-center space-x-2 text-sm font-normal">
            <FormField
              control={form.control}
              name="companyAddress"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                    <FormLabel
                      htmlFor={field.name}
                      className="text-secondary-foreground w-14 text-sm font-normal"
                    >
                      地址
                    </FormLabel>
                    <FormControl>
                      <Input
                        id={field.name}
                        className="h-8 bg-white text-sm"
                        {...field}
                        placeholder="地址"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="fixed right-0 bottom-0 flex w-full justify-end">
            <GcButton>保存</GcButton>
          </div>
        </form>
      </Form>
    </div>
  );
};
