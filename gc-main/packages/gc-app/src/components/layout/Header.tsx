"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAppNavigation } from "@/lib/useAppNavigation";
import { Button, Container } from "@/components/ui";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const pathname = usePathname();
  const { navigate } = useAppNavigation();

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.products"), href: "/products" },
    { name: t("nav.pricing"), href: "/pricing" },
    { name: t("nav.blog"), href: "/blog" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <Container>
        <div className="mx-0 sm:mx-4 mt-4">
          <nav
            className={cn(
              "glass-strong rounded-2xl px-4 sm:px-6 py-3",
              "flex items-center justify-between"
            )}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
                <span className="text-white font-bold text-sm">GC</span>
              </div>
              <span className="font-display font-semibold text-gray-900 hidden sm:block">
                Globalchats
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "font-medium transition-colors",
                    pathname === item.href
                      ? "text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Desktop CTA + Language Switcher */}
            <div className="hidden lg:flex items-center justify-end gap-3 flex-1">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                {t("nav.login")}
              </Button>
              <Button variant="gradient" size="sm" onClick={() => navigate("/register")}>
                {t("nav.getStarted")}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-2 glass-strong rounded-2xl p-4">
              <div className="flex flex-col gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <hr className="my-2 border-gray-200" />
                <div className="px-4 py-2">
                  <LanguageSwitcher />
                </div>
                <Button variant="ghost" className="w-full justify-center" onClick={() => navigate("/login")}>
                {t("nav.login")}
                </Button>
                <Button variant="gradient" className="w-full justify-center" onClick={() => navigate("/register")}>
                {t("nav.getStarted")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
