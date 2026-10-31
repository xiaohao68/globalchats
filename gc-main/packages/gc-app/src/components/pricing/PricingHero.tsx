"use client";

import { useTranslation } from "@/i18n/useTranslation";
import { Badge, Container } from "@/components/ui";
import { GradientOrb, GridBackground } from "@/components/effects";
import { cn } from "@/lib/utils";

interface PricingHeroProps {
  billingPeriod: "monthly" | "yearly";
  onPeriodChange: (period: "monthly" | "yearly") => void;
}

export function PricingHero({
  billingPeriod,
  onPeriodChange,
}: PricingHeroProps) {
  const { t } = useTranslation();

  return (
    <section className="relative pt-32 pb-12 overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 -z-10">
        <GridBackground />
        <GradientOrb
          className="absolute top-0 left-1/4 w-80 h-80"
          colors={["#3B82F6", "#8B5CF6"]}
          blur="3xl"
          opacity={25}
        />
      </div>

      <Container>
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="default" className="mb-4">
            {t("pricing.hero.badge")}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900">
            {t("pricing.hero.title1")}
            <span className="gradient-text">{t("pricing.hero.title2")}</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
            {t("pricing.hero.subtitle")}
          </p>

          {/* 月付/年付切换 */}
          <div className="mt-10 inline-flex items-center gap-4 p-1 bg-gray-100 rounded-full">
            <button
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingPeriod === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => onPeriodChange("monthly")}
            >
              {t("pricing.hero.monthly")}
            </button>
            <button
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                billingPeriod === "yearly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => onPeriodChange("yearly")}
            >
              {t("pricing.hero.yearly")}
              <span className="text-xs bg-accent-emerald text-white px-2 py-0.5 rounded-full">
                {t("pricing.hero.save")}
              </span>
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
