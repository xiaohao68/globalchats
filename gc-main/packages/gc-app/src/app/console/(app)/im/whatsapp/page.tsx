import * as React from "react";
import WhatsAppBrowser from "@/modules/im/components/whatsapp/whatsapp-browser";

export default function Page() {
  return (
    <React.Suspense fallback={<div className="py-4 text-center">Loading...</div>}>
      <WhatsAppBrowser />
    </React.Suspense>
  );
}
