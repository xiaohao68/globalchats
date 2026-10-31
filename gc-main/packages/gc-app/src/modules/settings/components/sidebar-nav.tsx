"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CreditCardIcon,
  PaletteIcon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/shadcn-ui-kit/ui/button";
import { Card, CardContent } from "@/shadcn-ui-kit/ui/card";

import { UsersIcon } from "lucide-react";

const sidebarMemberNavItems = [
  {
    title: "Profile",
    href: "/console/settings",
    icon: UserIcon,
  },
  {
    title: "Appearance",
    href: "/console/settings/appearance",
    icon: PaletteIcon,
  },
  {
    title: "Notifications",
    href: "/console/settings/notifications",
    icon: BellIcon,
  },
];

const sidebarWorkspaceNavItems = [
  {
    title: "General",
    href: "/console/settings/general",
    icon: UserIcon,
  },
  {
    title: "Members",
    href: "/console/settings/members",
    icon: UsersIcon,
  },
  {
    title: "Billing",
    href: "/console/settings/billing",
    icon: CreditCardIcon,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <Card className="py-0">
        <CardContent className="p-0 pb-1">
          <nav className="flex flex-col space-y-0.5 space-x-2 lg:space-x-0">
            <span className="mx-3 my-3 text-xs text-muted-foreground">Personal</span>

            {sidebarMemberNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={
                  pathname === item.href
                    ? "bg-muted hover:bg-muted justify-start"
                    : "hover:bg-muted justify-start"
                }
                asChild
              >
                <Link href={item.href}>
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </CardContent>
      </Card>

      <Card className="py-0 mt-4">
        <CardContent className="p-0 pb-1">
          <nav className="flex flex-col space-y-0.5 space-x-2 lg:space-x-0">
            <span className="mx-3 my-3 text-xs text-muted-foreground">Workspace</span>

            {sidebarWorkspaceNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={
                  pathname === item.href
                    ? "bg-muted hover:bg-muted justify-start"
                    : "hover:bg-muted justify-start"
                }
                asChild
              >
                <Link href={item.href}>
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </CardContent>
      </Card>
    </>
  );
}
