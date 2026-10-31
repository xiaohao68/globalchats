import { FC, useCallback, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@gc/ui/components/form.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { globalStore, useGlobalStore, userStore } from "@gc/store";
import { GcGlassInput } from "@gc/ui/custorm-components";
import { GcMagneticButton } from "@gc/ui/custorm-components";
import { Checkbox } from "@gc/ui/components/checkbox.tsx";
import { Link, useNavigate } from "react-router";
import { ERouterPath, LanguageCodes, SideWebviewId, IUser } from "@gc/model";
import { useMutation } from "@tanstack/react-query";
import { apiImLogin, completeSignIn, apiTranslateModelList } from "@gc/api";
import { toast } from "sonner";
import { IconLoading } from "@/components/icons";
import { isEmpty } from "lodash-es";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gc/ui/components/dialog.tsx";
import { ImUserWithToken } from "@gc/api/gen/graphql.ts";
import { cn } from "@gc/ui/lib/utils";

export const formSchema = z.object({
  keepLogin: z.boolean(),
  email: z.string().trim().email("请输入有效的电子邮件"),
  password: z.string().trim().min(1, "请输入密码"),
});
type FormType = z.infer<typeof formSchema>;

export const SignInForm: FC = () => {
  const navigate = useNavigate();
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [accountList, setAccountList] = useState<ImUserWithToken[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ImUserWithToken | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormType | null>(null);

  const { mutateAsync: signInMutationAsync, isPending } = useMutation({
    mutationFn: (data: FormType) => apiImLogin(data),
    onError: (error) => {
      toast.error(`${error.message}`);
    },
  });

  const globalSetting = useGlobalStore((store) => store.globalSetting);

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      keepLogin: globalSetting.signState.keepSign,
      email: globalSetting.signState.keepSign
        ? globalSetting.signState.email
        : "",
      password: globalSetting.signState.keepSign
        ? globalSetting.signState.password
        : "",
    },
  });

  const completeLogin = useCallback(
    async (user: IUser, data: FormType) => {
      globalStore.updateGlobalSetting({
        signState: {
          keepSign: data.keepLogin,
          email: data.email,
          password: data.password,
        },
      });

      globalStore.signIn(user);
      const globalTranslateConfig = userStore.globalSetting.translate;
      if (isEmpty(globalTranslateConfig.modelId)) {
        try {
          const { defaultModel } = await apiTranslateModelList();
          if (defaultModel) {
            globalTranslateConfig.modelId = defaultModel.id;
            globalTranslateConfig.receiveMessage.enable = true;
            globalTranslateConfig.receiveMessage.from = LanguageCodes.auto;
            globalTranslateConfig.receiveMessage.to =
              userStore.globalSetting.i18n;
            globalTranslateConfig.sendMessage.enable = true;
            globalTranslateConfig.sendMessage.from = userStore.globalSetting.i18n;
            globalTranslateConfig.sendMessage.to = LanguageCodes["en-US"];

            userStore.updateGlobalSetting({
              translate: globalTranslateConfig,
            });
          }
        } catch (e) {
          console.warn("[SignIn] Failed to load translation models, skipping:", e);
        }
      }

      navigate(ERouterPath.singleChat);
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [SideWebviewId],
          type: EChannelMessageEventType.refreshStoreState,
          payload: {},
        }),
      );
    },
    [navigate],
  );

  const handleAccountSelect = useCallback(
    async (account: ImUserWithToken) => {
      setShowAccountSelector(false);
      const user = completeSignIn(account);
      if (pendingFormData) {
        await completeLogin(user, pendingFormData);
      }
      setPendingFormData(null);
    },
    [pendingFormData, completeLogin],
  );

  const onSubmit = useCallback(
    async (data: FormType) => {
      try {
        const result = await signInMutationAsync(data);

        if (result.users.length === 1) {
          // 只有一个账号，直接登录
          const user = completeSignIn(result.users[0]);
          await completeLogin(user, data);
        } else {
          // 多个账号，显示选择弹窗
          setAccountList(result.users);
          setPendingFormData(data);
          setShowAccountSelector(true);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [signInMutationAsync, completeLogin],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="animate-[fade-in-up_0.5s_ease-out_0.1s_both]">
              <FormControl>
                <GcGlassInput
                  type="email"
                  placeholder="请输入电子邮箱"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="animate-[fade-in-up_0.5s_ease-out_0.2s_both]">
              <FormControl>
                <GcGlassInput
                  type="password"
                  placeholder="请输入密码"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <div className="animate-[fade-in-up_0.5s_ease-out_0.3s_both]">
          <GcMagneticButton
            disabled={isPending}
            type="submit"
            size="lg"
            fullWidth
          >
            {isPending && <IconLoading />}
            登录
          </GcMagneticButton>
        </div>

        <div className="flex items-center justify-between animate-[fade-in-up_0.5s_ease-out_0.4s_both]">
          <FormField
            control={form.control}
            name="keepLogin"
            render={({ field }) => (
              <FormItem className="flex items-center space-y-0 space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-white/20 data-[state=checked]:bg-[var(--gc-brand)] data-[state=checked]:border-[var(--gc-brand)]"
                  />
                </FormControl>
                <FormLabel className="text-[var(--gc-text-secondary)]">保持登录</FormLabel>
              </FormItem>
            )}
          />
          <div className="flex gap-4 text-sm">
            <Link
              to="https://www.baidu.com"
              target="_blank"
              onClick={(event) => {
                event.stopPropagation();
                toast.info("请联系企业管理员");
              }}
              className="text-[var(--gc-text-secondary)] hover:text-[var(--gc-brand)] transition-colors"
            >
              找回密码
            </Link>
            <Link
              className="text-[var(--gc-brand)] hover:underline"
              to={import.meta.env.VITE_CMS_URL}
              target="_blank"
            >
              注册
            </Link>
          </div>
        </div>
      </form>

      {/* 账号选择弹窗 */}
      <Dialog open={showAccountSelector} onOpenChange={setShowAccountSelector}>
        <DialogContent className="sm:max-w-md gc-glass !bg-[var(--gc-surface-1)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-[var(--gc-text-primary)]">选择登录账号</DialogTitle>
            <DialogDescription className="text-[var(--gc-text-secondary)]">
              该邮箱关联了多个账号，请选择要登录的账号
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {accountList.map((account) => (
              <div
                key={account.imUser.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  selectedAccount?.imUser.id === account.imUser.id
                    ? "border-[var(--gc-brand)] bg-[var(--gc-surface-2)]"
                    : "border-white/10 hover:bg-[var(--gc-surface-1)]"
                )}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="flex-1">
                  <div className="font-medium text-[var(--gc-text-primary)]">
                    {account.imUser.name || account.imUser.username}
                  </div>
                </div>
                {selectedAccount?.imUser.id === account.imUser.id && (
                  <div className="text-[var(--gc-brand)]">✓</div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <GcMagneticButton
              variant="glass"
              onClick={() => {
                setShowAccountSelector(false);
                setPendingFormData(null);
              }}
            >
              取消
            </GcMagneticButton>
            <GcMagneticButton
              disabled={!selectedAccount}
              onClick={() => {
                if (selectedAccount) {
                  handleAccountSelect(selectedAccount);
                }
              }}
            >
              确认登录
            </GcMagneticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};
