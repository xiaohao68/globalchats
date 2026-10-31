import { FC, memo } from "react";
import { Waveform } from "ldrs/react";

export const ThreeDotsWave: FC = memo(() => {
  return (
    <div
      style={{
        display: "inline-block",
        paddingLeft: "2px",
      }}
    >
      <Waveform size="14" stroke="2" speed="0.8" color="currentColor" />
    </div>
  );
});
