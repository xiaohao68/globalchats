import { EPlatform } from "@gc/model";
import { cn } from "@gc/ui/lib/utils";
import { platformColors, DEFAULT_PLATFORM_COLOR } from "../../constants";
import {
  TelegramIcon,
  WhatsAppIcon,
  MessengerIcon,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  LinkedInIcon,
  TeamsIcon,
  AggregatedIcon,
  DefaultChatIcon,
} from "../icons";
import type { IconProps } from "../icons";

interface PlatformIconProps {
  platform: EPlatform;
  size?: number;
  className?: string;
}

type IconComponentType = React.FC<IconProps>;

const platformIcons: Record<EPlatform, IconComponentType> = {
  [EPlatform.Telegram]: TelegramIcon,
  [EPlatform.Whatsapp]: WhatsAppIcon,
  [EPlatform.WhatsappBusinessAPI]: WhatsAppIcon,
  [EPlatform.Messenger]: MessengerIcon,
  [EPlatform.Instagram]: InstagramIcon,
  [EPlatform.Facebook]: FacebookIcon,
  [EPlatform.Tiktok]: TikTokIcon,
  [EPlatform.Linkedin]: LinkedInIcon,
  [EPlatform.Teams]: TeamsIcon,
  [EPlatform.Line]: DefaultChatIcon,
  [EPlatform.Zalo]: DefaultChatIcon,
  [EPlatform.Fingerprint]: DefaultChatIcon,
  [EPlatform.Aggregated]: AggregatedIcon,
};

export function PlatformIcon({
  platform,
  size = 20,
  className,
}: PlatformIconProps) {
  const IconComponent = platformIcons[platform] || DefaultChatIcon;
  // 如果有 className 包含 text-white，使用白色，否则使用平台颜色
  const useWhite = className?.includes("text-white");
  const color = useWhite
    ? "#FFFFFF"
    : platformColors[platform] || DEFAULT_PLATFORM_COLOR;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <IconComponent size={size} color={color} />
    </span>
  );
}

// Re-export platformColors for backward compatibility
export { platformColors };
