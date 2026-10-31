"use client";

import { BlogHero, BlogList } from "@/components/blog";
import { CTA } from "@/components/home";

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <BlogList />
      <CTA />
    </>
  );
}
