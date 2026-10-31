import { FC } from "react";
import { Label } from "@gc/ui/components/label";
import { SearchSelector } from "@gc/ui/custorm-components";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { FINGERPRINT_PRESETS } from "@/constants/fingerprintPresets";
import { Button } from "@gc/ui/components/button";
import { Shuffle } from "lucide-react";

export const FingerprintSection: FC = () => {
  const { fingerprintConfig, applyFingerprintPreset } = useSessionConfigStore();

  const presetOptions = FINGERPRINT_PRESETS.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handlePresetChange = (presetId: string) => {
    const preset = FINGERPRINT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      applyFingerprintPreset(preset);
    }
  };

  const handleRandomPreset = () => {
    const randomIndex = Math.floor(Math.random() * FINGERPRINT_PRESETS.length);
    const randomPreset = FINGERPRINT_PRESETS[randomIndex];
    applyFingerprintPreset(randomPreset);
  };

  const currentPreset = FINGERPRINT_PRESETS.find(
    (p) => p.id === fingerprintConfig.presetId
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">浏览器指纹</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleRandomPreset}
          title="随机选择预设"
        >
          <Shuffle size={14} />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">预设</Label>
          <SearchSelector
            value={fingerprintConfig.presetId || "chrome-win"}
            onChange={handlePresetChange}
            placeholder="请选择预设"
            options={presetOptions}
          />
        </div>

        {currentPreset && (
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5 overflow-hidden">
            <div className="flex gap-2">
              <span className="shrink-0 text-muted-foreground/70">平台:</span>
              <span className="truncate">{currentPreset.platform}</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 text-muted-foreground/70">分辨率:</span>
              <span>{currentPreset.screenWidth} x {currentPreset.screenHeight}</span>
            </div>
            <div className="flex gap-2 min-w-0">
              <span className="shrink-0 text-muted-foreground/70">UA:</span>
              <span className="truncate" title={currentPreset.userAgent}>
                {currentPreset.userAgent}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
