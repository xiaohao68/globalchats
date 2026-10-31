import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@gc/ui/components/alert-dialog.tsx";
import { Button } from "@gc/ui/components/button.tsx";
import { CircleFadingArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@gc/lib/utils.ts";
import { webviewManger } from "@gc/webview";
import { Progress } from "@gc/ui/components/progress.tsx";
import { relaunch } from "@tauri-apps/plugin-process";
import Markdown from "react-markdown";
import "github-markdown-css/github-markdown.css";

export const CheckForAppUpdater = () => {
  const ref = useRef<HTMLButtonElement>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const { data } = useQuery({
    queryKey: [check.name, CheckForAppUpdater.name],
    queryFn: () => check(),
    retry: false,
    refetchInterval: ({ state }) => {
      const data = state.data;
      if (data?.available) {
        return false;
      }
      return 60_000;
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationKey: [data],
    mutationFn: async () => {
      webviewManger.closeAll();

      if (data?.available) {
        let downloaded = 0;
        let contentLength = 0;
        setUpdateProgress(0);
        await data.downloadAndInstall((progress) => {
          switch (progress.event) {
            case "Started":
              contentLength = progress.data.contentLength!;
              break;
            case "Progress":
              downloaded += progress.data.chunkLength;
              setUpdateProgress(
                Math.round(((downloaded / contentLength) * 100) / 100),
              );
              break;
            case "Finished":
              setUpdateProgress(100);
              break;
          }
        });
        await relaunch();
      }
    },
  });
  useEffect(() => {
    if (data?.available) {
      ref.current?.click();
      webviewManger.closeAll();
    }
  }, [data]);

  return (
    <AlertDialog
    // open={open}
    >
      <AlertDialogTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          className={cn(
            "hover:text-primary text-success size-7",
            !data?.available && "hidden",
          )}
        >
          <CircleFadingArrowUp className="size-5" size={20} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="">
            有新版本V{data?.version}，立即升级？
          </AlertDialogTitle>
          {isPending && (
            <div className="flex items-center">
              <Progress value={updateProgress} />
              <span className="w-14 text-center">{updateProgress}%</span>
            </div>
          )}

          <AlertDialogDescription className="markdown-body max-h-[50vh] overflow-scroll">
            <Markdown>{data?.body}</Markdown>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/*<AlertDialogCancel>Cancel</AlertDialogCancel>*/}
          <Button disabled={isPending} onClick={() => mutateAsync()}>
            {isPending && <Loader2 className="animate-spin" />}
            立即更新
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
