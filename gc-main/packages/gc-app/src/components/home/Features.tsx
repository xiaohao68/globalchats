"use client";

import {
  Zap,
  Shield,
  Globe,
  Layers,
  Sparkles,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Badge, Container, GlassCard } from "@/components/ui";

const featureConfig: { key: string; icon: LucideIcon }[] = [
  { key: "speed", icon: Zap },
  { key: "security", icon: Shield },
  { key: "global", icon: Globe },
  { key: "scalable", icon: Layers },
  { key: "ai", icon: Sparkles },
  { key: "analytics", icon: BarChart3 },
];

export function Features() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-32 bg-gray-50/50">
      <Container>
        {/* 标题区域 */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="default" className="mb-4">
            {t("home.features.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {t("home.features.title")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("home.features.subtitle")}
          </p>
        </div>

        {/* 特性网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {featureConfig.map((feature, index) => (
            <GlassCard
              key={feature.key}
              className="p-6 lg:p-8 hover-lift"
              opacity={90}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* 图标 */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              {/* 标题 */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t(`home.features.items.${feature.key}.title`)}
              </h3>

              {/* 描述 */}
              <p className="text-gray-600">
                {t(`home.features.items.${feature.key}.description`)}
              </p>
            </GlassCard>
          ))}
        </div>
      </Container>
    </section>
  );
}
