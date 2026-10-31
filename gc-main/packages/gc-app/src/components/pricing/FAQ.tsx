"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Container, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t, raw } = useTranslation();

  const faqs = raw<Array<{ question: string; answer: string }>>("pricing.faq.items");

  return (
    <section className="py-20 lg:py-32">
      <Container size="md">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4">
            {t("pricing.faq.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {t("pricing.faq.title")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">{t("pricing.faq.subtitle")}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                "rounded-2xl border transition-all duration-200",
                openIndex === index
                  ? "border-primary-200 bg-primary-50/50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-500 flex-shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
