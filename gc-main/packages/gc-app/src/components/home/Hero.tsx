"use client";

import { ArrowRight, Play } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { Button, Badge, Container } from "@/components/ui";
import { GradientOrb, GridBackground } from "@/components/effects";

export function Hero() {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* 背景效果 */}
      <div className="absolute inset-0 -z-10">
        <GridBackground />

        {/* 渐变光球 */}
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
        <div className="text-center max-w-4xl mx-auto py-16 lg:py-24">
          {/* Badge */}
          <Badge variant="outline" className="mb-6 animate-fade-in-up">
            <span className="mr-2">🚀</span>
            {t("home.hero.badge")}
          </Badge>

          {/* 主标题 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in-up [animation-delay:100ms]">
            <span className="text-gray-900">{t("home.hero.title1")}</span>
            <br />
            <span className="gradient-text">{t("home.hero.title2")}</span>
          </h1>

          {/* 副标题 */}
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up [animation-delay:200ms]">
            {t("home.hero.subtitle")}
          </p>

          {/* CTA 按钮 */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up [animation-delay:300ms]">
            <Button variant="gradient" size="lg" glow onClick={() => navigate("/register")}>
              {t("home.hero.freeStart")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="ghost" size="lg">
              <Play className="mr-2 h-5 w-5" />
              {t("home.hero.watchDemo")}
            </Button>
          </div>

          {/* Hero 图片区域 */}
          <div className="mt-16 relative animate-fade-in-up [animation-delay:400ms]">
            <div className="glass rounded-2xl p-2 mx-auto max-w-5xl shadow-2xl">
              <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">GC</span>
                  </div>
                  <p className="text-gray-500">{t("home.hero.previewText")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
