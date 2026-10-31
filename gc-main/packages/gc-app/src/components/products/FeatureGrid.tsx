"use client";

import {
  Cloud,
  Lock,
  Gauge,
  Users,
  Puzzle,
  HeadphonesIcon,
  LineChart,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Container, GlassCard, Badge } from "@/components/ui";

const featureConfig: { key: string; icon: LucideIcon }[] = [
  { key: "cloud", icon: Cloud },
  { key: "security", icon: Lock },
  { key: "performance", icon: Gauge },
  { key: "collaboration", icon: Users },
  { key: "integration", icon: Puzzle },
  { key: "support", icon: HeadphonesIcon },
  { key: "insights", icon: LineChart },
  { key: "updates", icon: RefreshCw },
];

export function FeatureGrid() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-32 bg-gray-50/50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="default" className="mb-4">
            {t("products.featureGrid.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {t("products.featureGrid.title")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">{t("products.featureGrid.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureConfig.map((feature) => (
            <GlassCard
              key={feature.key}
              className="p-6 hover-lift text-center"
              opacity={85}
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-purple/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {t(`products.featureGrid.items.${feature.key}.title`)}
              </h3>
              <p className="text-sm text-gray-600">
                {t(`products.featureGrid.items.${feature.key}.description`)}
              </p>
            </GlassCard>
          ))}
        </div>
      </Container>
    </section>
  );
}
