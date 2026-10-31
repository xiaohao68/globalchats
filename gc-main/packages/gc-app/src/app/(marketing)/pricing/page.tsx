"use client";

import { useState } from "react";
import {
  PricingHero,
  PricingCards,
  PlanComparison,
  FAQ,
} from "@/components/pricing";
import { CTA } from "@/components/home";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <>
      <PricingHero
        billingPeriod={billingPeriod}
        onPeriodChange={setBillingPeriod}
      />
      <PricingCards billingPeriod={billingPeriod} />
      <PlanComparison />
      <FAQ />
      <CTA />
    </>
  );
}
