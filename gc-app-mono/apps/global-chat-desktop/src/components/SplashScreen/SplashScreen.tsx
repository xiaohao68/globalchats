import { FC } from "react";
import splashScreenJson from "./splash-screen.json";
import { useLottie } from "lottie-react";

export const SplashScreen: FC = () => {
  const { View } = useLottie({
    animationData: splashScreenJson,
    loop: true,
    className: "w-40 h-30",
  });

  return (
    <div className="flex h-svh w-full items-center justify-center">{View}</div>
  );
};
