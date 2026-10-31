"use client";

import { Newspaper } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Badge, Container } from "@/components/ui";
import { GradientOrb, GridBackground } from "@/components/effects";

export function BlogHero() {
  const { t } = useTranslation();

  return (
    <section className="relative pt-32 pb-16 overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 -z-10">
        <GridBackground />
        <GradientOrb
          className="absolute top-20 right-1/4 w-96 h-96"
          colors={["#3B82F6", "#8B5CF6"]}
          blur="3xl"
          opacity={30}
        />
        <GradientOrb
          className="absolute bottom-20 left-1/4 w-80 h-80"
          colors={["#06B6D4", "#3B82F6"]}
          blur="3xl"
          opacity={20}
        />
      </div>

      <Container>
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge variant="outline" className="mb-6 animate-fade-in-up">
            <Newspaper className="w-4 h-4 mr-2" />
            {t("blog.hero.badge")}
          </Badge>

          {/* 主标题 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight animate-fade-in-up [animation-delay:100ms]">
            <span className="text-gray-900">{t("blog.hero.title1")}</span>
            <span className="gradient-text">{t("blog.hero.title2")}</span>
          </h1>

          {/* 副标题 */}
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up [animation-delay:200ms]">
            {t("blog.hero.subtitle")}
          </p>
        </div>
      </Container>
    </section>
  );
}
