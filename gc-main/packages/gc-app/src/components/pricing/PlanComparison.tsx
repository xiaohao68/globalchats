"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Container, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

function renderValue(value: boolean | string) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-primary-500 mx-auto" />
    ) : (
      <span className="text-gray-300">—</span>
    );
  }
  return <span className="text-gray-700">{value}</span>;
}

export function PlanComparison() {
  const { t } = useTranslation();

  const comparisonData = [
    {
      category: t("pricing.comparison.categories.basic"),
      features: [
        {
          name: t("pricing.comparison.items.apiCalls"),
          free: t("pricing.comparison.values.100PerDay"),
          pro: t("pricing.comparison.values.10000PerDay"),
          enterprise: t("pricing.comparison.values.unlimited"),
        },
        {
          name: t("pricing.comparison.items.storage"),
          free: t("pricing.comparison.values.1GB"),
          pro: t("pricing.comparison.values.50GB"),
          enterprise: t("pricing.comparison.values.unlimited"),
        },
        {
          name: t("pricing.comparison.items.dataExport"),
          free: t("pricing.comparison.values.csv"),
          pro: t("pricing.comparison.values.csvExcel"),
          enterprise: t("pricing.comparison.values.allFormats"),
        },
        {
          name: t("pricing.comparison.items.historyRetention"),
          free: t("pricing.comparison.values.7days"),
          pro: t("pricing.comparison.values.90days"),
          enterprise: t("pricing.comparison.values.forever"),
        },
      ],
    },
    {
      category: t("pricing.comparison.categories.ai"),
      features: [
        { name: t("pricing.comparison.items.basicAI"), free: true, pro: true, enterprise: true },
        { name: t("pricing.comparison.items.advancedAI"), free: false, pro: true, enterprise: true },
        { name: t("pricing.comparison.items.customTraining"), free: false, pro: false, enterprise: true },
        { name: t("pricing.comparison.items.aiWorkflow"), free: false, pro: true, enterprise: true },
      ],
    },
    {
      category: t("pricing.comparison.categories.team"),
      features: [
        {
          name: t("pricing.comparison.items.teamMembers"),
          free: t("pricing.comparison.values.1person"),
          pro: t("pricing.comparison.values.5persons"),
          enterprise: t("pricing.comparison.values.unlimited"),
        },
        { name: t("pricing.comparison.items.permissions"), free: false, pro: true, enterprise: true },
        { name: t("pricing.comparison.items.auditLog"), free: false, pro: false, enterprise: true },
        { name: t("pricing.comparison.items.sso"), free: false, pro: false, enterprise: true },
      ],
    },
    {
      category: t("pricing.comparison.categories.support"),
      features: [
        { name: t("pricing.comparison.items.communitySupport"), free: true, pro: true, enterprise: true },
        { name: t("pricing.comparison.items.emailSupport"), free: false, pro: true, enterprise: true },
        { name: t("pricing.comparison.items.dedicatedService"), free: false, pro: false, enterprise: true },
        { name: t("pricing.comparison.items.sla"), free: false, pro: false, enterprise: true },
      ],
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-gray-50/50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="default" className="mb-4">
            {t("pricing.comparison.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {t("pricing.comparison.title")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">{t("pricing.comparison.subtitle")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900 w-1/4">
                  {t("pricing.comparison.columnFeature")}
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900 w-1/4">
                  {t("pricing.comparison.columnFree")}
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900 w-1/4 bg-primary-50 rounded-t-lg">
                  {t("pricing.comparison.columnPro")}
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900 w-1/4">
                  {t("pricing.comparison.columnEnterprise")}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((section) => (
                <Fragment key={section.category}>
                  <tr>
                    <td
                      colSpan={4}
                      className="pt-8 pb-4 px-4 font-semibold text-gray-900 bg-gray-100/50"
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.features.map((feature, idx) => (
                    <tr
                      key={feature.name}
                      className={cn(
                        "border-b border-gray-100",
                        idx === section.features.length - 1 && "border-b-0"
                      )}
                    >
                      <td className="py-4 px-4 text-gray-600">{feature.name}</td>
                      <td className="py-4 px-4 text-center">
                        {renderValue(feature.free)}
                      </td>
                      <td className="py-4 px-4 text-center bg-primary-50/50">
                        {renderValue(feature.pro)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderValue(feature.enterprise)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
