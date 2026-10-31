"use client";

import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { Button, Container } from "@/components/ui";
import { GradientOrb } from "@/components/effects";

export function CTA() {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();

  return (
    <section className="py-20 lg:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-purple p-8 lg:p-16">
          {/* 背景装饰 */}
          <div className="absolute inset-0 overflow-hidden">
            <GradientOrb
              className="absolute -top-20 -right-20 w-64 h-64"
              colors={["#ffffff", "#ffffff"]}
              opacity={10}
              animate={false}
            />
            <GradientOrb
              className="absolute -bottom-20 -left-20 w-64 h-64"
              colors={["#ffffff", "#ffffff"]}
              opacity={10}
              animate={false}
            />
          </div>

          {/* 内容 */}
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              {t("home.cta.title")}
            </h2>
            <p className="mt-4 text-lg text-white/80">
              {t("home.cta.subtitle")}
            </p>

            {/* 按钮组 */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100"
                onClick={() => navigate("/register")}
              >
                {t("home.cta.freeStart")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-white border-white/30 hover:bg-white/10"
              >
                {t("home.cta.contactSales")}
              </Button>
            </div>

            {/* 信任标识 */}
            <p className="mt-8 text-sm text-white/60">
              {t("home.cta.trustText")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
