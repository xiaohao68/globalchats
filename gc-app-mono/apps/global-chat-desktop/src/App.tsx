import { Router } from "@/routes";
import { FC } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { SplashScreen } from "@/components/SplashScreen/SplashScreen.tsx";
import { useQuery } from "@tanstack/react-query";
import { initApp } from "@gc/app-init";

export const App: FC = () => {
  useHotkeys(
    ["enter", "esc"],
    (keyboardEvent) => {
      const target = keyboardEvent.target as HTMLInputElement;
      if (target.tagName === "INPUT") {
        target.blur();
      }
    },
    {
      enableOnFormTags: true,
    },
  );

  const { isFetching } = useQuery({
    queryKey: [initApp.name],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async () => {
      await initApp();
      return true;
    },
  });

  if (isFetching) {
    return <SplashScreen />;
  }

  return <Router />;
};
