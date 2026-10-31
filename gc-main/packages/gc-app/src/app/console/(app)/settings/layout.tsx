import { SidebarNav } from "@/modules/settings/components/sidebar-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 lg:space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="w-full">
          <SidebarNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
