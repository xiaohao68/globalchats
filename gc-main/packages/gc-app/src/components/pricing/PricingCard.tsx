"use client";

import { Check, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  description: string;
  price: {
    monthly: string;
    yearly: string;
  };
  features: Array<{
    text: string;
    included: boolean;
  }>;
  highlighted?: boolean;
  badge?: string;
  buttonText: string;
  buttonVariant?: "primary" | "gradient" | "ghost";
}

interface PricingCardProps {
  plan: PricingPlan;
  billingPeriod: "monthly" | "yearly";
}

export function PricingCard({ plan, billingPeriod }: PricingCardProps) {
  const { t } = useTranslation();
  const { navigate } = useAppNavigation();
  const price =
    billingPeriod === "monthly" ? plan.price.monthly : plan.price.yearly;
  const isContactPrice =
    price === "联系我们" || price === "Contact Us" || price === t("pricing.price.enterprise.monthly");

  return (
    <div
      className={cn(
        "relative rounded-2xl p-8 transition-all duration-300 h-full flex flex-col",
        plan.highlighted
          ? "bg-gradient-to-b from-primary-50 to-white border-2 border-primary-200 shadow-lg scale-105 z-10"
          : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg"
      )}
    >
      {/* 推荐标签 */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="gradient">{plan.badge}</Badge>
        </div>
      )}

      {/* 计划名称 */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
        <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
      </div>

      {/* 价格 */}
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        {!isContactPrice && (
          <span className="text-gray-500 ml-2">
            {billingPeriod === "monthly"
              ? t("pricing.priceUnit.monthly")
              : t("pricing.priceUnit.yearly")}
          </span>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

      {/* 功能列表 */}
      <ul className="space-y-3 flex-grow">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <span
              className={cn(
                "text-sm",
                feature.included ? "text-gray-700" : "text-gray-400"
              )}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA 按钮 */}
      <Button
        variant={plan.buttonVariant || (plan.highlighted ? "gradient" : "ghost")}
        className="w-full mt-8"
        glow={plan.highlighted}
        onClick={() => navigate("/register")}
      >
        {plan.buttonText}
      </Button>
    </div>
  );
}
