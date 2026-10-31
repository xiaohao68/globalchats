import { FC } from "react";
import { RsvCardTitle } from "@/pages/right-side-view/components";
import { cn } from "@gc/lib/utils.ts";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@gc/ui/components/form.tsx";
import { Input } from "@gc/ui/components/input.tsx";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TempNavigateBtn } from "@/pages/right-side-view/components/TempNavigateBtn.tsx";

const FormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});
export const FansStatistics: FC = () => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    // toast({
    //   title: "You submitted the following values:",
    //   description: (
    //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <RsvCardTitle>
        <div className={cn("text-base font-medium text-[#151b26] select-none")}>
          粉丝统计-暂时不做
        </div>
      </RsvCardTitle>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 px-6 pt-2"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    协议
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 bg-white"
                      placeholder="shadcn"
                      {...field}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    主机
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 bg-white"
                      placeholder="shadcn"
                      {...field}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    端口
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 bg-white"
                      placeholder="shadcn"
                      {...field}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    用户名
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 bg-white"
                      placeholder="shadcn"
                      {...field}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="grid grid-cols-[auto_1fr] grid-rows-1 items-center gap-4">
                  <FormLabel className="text-secondary-foreground w-14 text-sm font-normal">
                    密码
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8 bg-white"
                      placeholder="shadcn"
                      {...field}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
        </form>
      </Form>
      <TempNavigateBtn />
    </div>
  );
};
