"use client";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { Button, Badge, Container } from "@/components/ui";
import { GradientOrb, GridBackground } from "@/components/effects";

export function ProductHero() {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 -z-10">
        <GridBackground />
        <GradientOrb
          className="absolute top-0 right-1/4 w-80 h-80"
          colors={["#3B82F6", "#8B5CF6"]}
          blur="3xl"
          opacity={25}
        />
      </div>

      <Container>
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="default" className="mb-4">
            {t("products.hero.badge")}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900">
            {t("products.hero.title1")}
            <span className="gradient-text">{t("products.hero.title2")}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {t("products.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="gradient" size="lg" glow onClick={() => navigate("/register")}>
              {t("products.hero.tryNow")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="ghost" size="lg">
              {t("products.hero.viewDocs")}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
