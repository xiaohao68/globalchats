import { IProxy } from "@gc/api";
import { FingerprintPreset } from "@/constants/fingerprintPresets";

export interface ProxySectionProps {
  proxyList: IProxy[];
  isLoading: boolean;
  onRefresh: () => void;
}

export interface FingerprintSectionProps {
  presets: FingerprintPreset[];
}
