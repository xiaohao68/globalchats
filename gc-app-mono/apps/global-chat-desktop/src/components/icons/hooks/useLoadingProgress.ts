import { useEffect, useRef } from "react";
import anime, { AnimeInstance } from "animejs";
import { ELoadingStatus, PlatformLoadingDuration } from "@gc/model";

const computeAnimateYFromLoadingStatus = (loadingStatus: ELoadingStatus) => {
  switch (loadingStatus) {
    case ELoadingStatus.init:
      return 79 - 0 * 158;
    case ELoadingStatus.navigation:
      return 79 - (1 / 3) * 158;
    case ELoadingStatus.started:
      return 79 - (2 / 3) * 158;
    case ELoadingStatus.finished:
      return 79 - 1 * 158;
    default:
      return 79 - 0 * 158;
  }
};

export const useLoadingProgress = (loadingStatus: ELoadingStatus) => {
  const amInsRef = useRef<AnimeInstance>(null);
  useEffect(() => {
    anime({
      targets: "#waveGroup",
      translateX: [0, 545],
      easing: "linear",
      duration: 2_500,
      direction: "normal",
      loop: true,
      round: 1,
    });

    const startY = computeAnimateYFromLoadingStatus(loadingStatus);
    // @ts-ignore
    amInsRef.current = anime({
      targets: "#waveGroupContainer",
      translateY: [startY, startY],
      easing: "linear",
      duration: PlatformLoadingDuration,
      round: 1,
    });
    // console.log(computeAnimateYFromLoadingStatus(loadingStatus))
  }, []);
  useEffect(() => {
    const amIns = amInsRef.current!;
    // @ts-ignore
    let preY = amIns.animations[0].tweens[0].to.numbers[0];
    const newY = computeAnimateYFromLoadingStatus(loadingStatus);

    // @ts-ignore
    amIns.animations[0].tweens[0].from.numbers[0] = preY;
    // @ts-ignore
    amIns.animations[0].tweens[0].to.numbers[0] = newY;
    amIns.restart();

    return () => {};
  }, [loadingStatus]);
};
