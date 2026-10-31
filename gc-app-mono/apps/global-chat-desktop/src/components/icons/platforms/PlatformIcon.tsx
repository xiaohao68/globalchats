import { FC, memo } from "react";
import { LucideProps, MessagesSquare } from "lucide-react";
import { EPlatform } from "@gc/model";
import { IconFacebook } from "@/components/icons/platforms/IconFacebook.tsx";
import { IconTelegram } from "@/components/icons/platforms/IconTelegram.tsx";
import { IconWhatsApp } from "@/components/icons/platforms/IconWhatsApp.tsx";
import { IconMessenger } from "@/components/icons/platforms/IconMessenger.tsx";
import { IconInstagram } from "@/components/icons/platforms/IconInstagram.tsx";
import { IconTiktok } from "@/components/icons/platforms/IconTiktok.tsx";
import { IconLine } from "@/components/icons/platforms/IconLine.tsx";
import { IconZalo } from "@/components/icons/platforms/IconZalo.tsx";
import { IconWhatsAppBusinessApi } from "@/components/icons/platforms/IconWhatsAppBusinessApi.tsx";
import { IconLinkedin } from "@/components/icons/platforms/IconLinkedin.tsx";
import { IconTeams } from "@/components/icons/platforms/IconTeams.tsx";
import { IconFingerprint } from "@/components/icons/platforms/IconFingerprint.tsx";

type Props = LucideProps & {
  isActive?: boolean;
  platform: EPlatform;
};

const IconAggregated: FC<Omit<Props, "platform">> = ({ size, className }) => (
  <MessagesSquare size={size} className={className} />
);

const Icons: Record<EPlatform, FC<Omit<Props, "platform">>> = {
  [EPlatform.Telegram]: IconTelegram,
  [EPlatform.Whatsapp]: IconWhatsApp,
  [EPlatform.WhatsappBusinessAPI]: IconWhatsAppBusinessApi,
  [EPlatform.Messenger]: IconMessenger,
  [EPlatform.Instagram]: IconInstagram,
  [EPlatform.Tiktok]: IconTiktok,
  [EPlatform.Facebook]: IconFacebook,
  [EPlatform.Line]: IconLine,
  [EPlatform.Zalo]: IconZalo,
  [EPlatform.Linkedin]: IconLinkedin,
  [EPlatform.Teams]: IconTeams,
  [EPlatform.Fingerprint]: IconFingerprint,
  [EPlatform.Aggregated]: IconAggregated,
};
export const PlatformIcon: FC<Props> = memo(
  ({
    size = 16,
    className,
    isActive = false,
    platform = EPlatform.Telegram,
    ...props
  }) => {
    const IconComponent = Icons[platform];

    return (
      <IconComponent
        size={size}
        className={className}
        isActive={isActive}
        {...props}
      />
    );
  },
);
