"use client";

import { ArrowRight, Workflow, Database, Bot, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button, Container, GlassCard } from "@/components/ui";

const showcaseConfig: { key: string; icon: LucideIcon }[] = [
  { key: "workflow", icon: Workflow },
  { key: "dataHub", icon: Database },
  { key: "aiAssistant", icon: Bot },
];

export function ProductShowcase() {
  const { t, raw } = useTranslation();

  return (
    <section className="py-20 lg:py-32">
      <Container>
        <div className="space-y-24 lg:space-y-32">
          {showcaseConfig.map((item, index) => {
            const title = t(`products.showcase.items.${item.key}.title`);
            const description = t(`products.showcase.items.${item.key}.description`);
            const features = raw<string[]>(`products.showcase.items.${item.key}.features`);

            return (
              <div
                key={item.key}
                className={`flex flex-col ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                } gap-12 lg:gap-16 items-center`}
              >
                {/* 图片区域 */}
                <div className="flex-1 w-full">
                  <GlassCard className="p-4 lg:p-6" opacity={80}>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl aspect-[4/3] flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                          <item.icon className="h-10 w-10 text-white" />
                        </div>
                        <p className="text-gray-500">
                          {title}
                          {t("products.showcase.previewSuffix")}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* 内容区域 */}
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mb-6">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    {title}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">{description}</p>

                  {/* 特性标签 */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {features.map((feature: string) => (
                      <span
                        key={feature}
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <Button variant="ghost">
                    {t("products.showcase.learnMore")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
