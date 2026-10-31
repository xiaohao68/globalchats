"use client";

import { useTranslation } from "@/i18n/useTranslation";
import { Container } from "@/components/ui";
import { PricingCard, type PricingPlan } from "./PricingCard";

interface PricingCardsProps {
  billingPeriod: "monthly" | "yearly";
}

export function PricingCards({ billingPeriod }: PricingCardsProps) {
  const { t } = useTranslation();

  const plans: PricingPlan[] = [
    {
      name: t("pricing.plans.free.name"),
      description: t("pricing.plans.free.description"),
      price: {
        monthly: t("pricing.price.free.monthly"),
        yearly: t("pricing.price.free.yearly"),
      },
      features: [
        { text: t("pricing.features.apiCalls100"), included: true },
        { text: t("pricing.features.storage1GB"), included: true },
        { text: t("pricing.features.basicAnalytics"), included: true },
        { text: t("pricing.features.communitySupport"), included: true },
        { text: t("pricing.features.advancedAI"), included: false },
        { text: t("pricing.features.team5"), included: false },
        { text: t("pricing.features.prioritySupport"), included: false },
        { text: t("pricing.features.customBrand"), included: false },
      ],
      buttonText: t("pricing.plans.free.button"),
      buttonVariant: "ghost",
    },
    {
      name: t("pricing.plans.pro.name"),
      description: t("pricing.plans.pro.description"),
      price: {
        monthly: t("pricing.price.pro.monthly"),
        yearly: t("pricing.price.pro.yearly"),
      },
      features: [
        { text: t("pricing.features.apiCalls10000"), included: true },
        { text: t("pricing.features.storage50GB"), included: true },
        { text: t("pricing.features.advancedAnalytics"), included: true },
        { text: t("pricing.features.emailSupport"), included: true },
        { text: t("pricing.features.allAI"), included: true },
        { text: t("pricing.features.team5"), included: true },
        { text: t("pricing.features.prioritySupport"), included: false },
        { text: t("pricing.features.customBrand"), included: false },
      ],
      highlighted: true,
      badge: t("pricing.plans.pro.badge"),
      buttonText: t("pricing.plans.pro.button"),
      buttonVariant: "gradient",
    },
    {
      name: t("pricing.plans.enterprise.name"),
      description: t("pricing.plans.enterprise.description"),
      price: {
        monthly: t("pricing.price.enterprise.monthly"),
        yearly: t("pricing.price.enterprise.yearly"),
      },
      features: [
        { text: t("pricing.features.apiCallsUnlimited"), included: true },
        { text: t("pricing.features.storageUnlimited"), included: true },
        { text: t("pricing.features.enterpriseAnalytics"), included: true },
        { text: t("pricing.features.dedicatedSupport"), included: true },
        { text: t("pricing.features.allAI"), included: true },
        { text: t("pricing.features.teamUnlimited"), included: true },
        { text: t("pricing.features.dedicatedTechSupport"), included: true },
        { text: t("pricing.features.customBrandPrivate"), included: true },
      ],
      buttonText: t("pricing.plans.enterprise.button"),
      buttonVariant: "ghost",
    },
  ];

  return (
    <section className="py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4 items-stretch">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
