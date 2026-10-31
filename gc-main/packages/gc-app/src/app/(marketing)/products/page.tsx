import type { Metadata } from "next";
import { ProductHero, ProductShowcase, FeatureGrid } from "@/components/products";
import { CTA } from "@/components/home";

export const metadata: Metadata = {
  title: "产品介绍 - Globalchats",
  description: "全方位的企业级解决方案，助力您的业务数字化转型升级。",
};

export default function ProductsPage() {
  return (
    <>
      <ProductHero />
      <ProductShowcase />
      <FeatureGrid />
      <CTA />
    </>
  );
}
