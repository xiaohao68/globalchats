import { Header, Footer } from "@/components/layout";
import { LinguiProvider } from "@/i18n/LinguiProvider";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LinguiProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </LinguiProvider>
  );
}
