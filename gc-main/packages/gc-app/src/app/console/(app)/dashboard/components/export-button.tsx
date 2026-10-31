import { FolderUp } from "lucide-react";
import { cn } from "@/modules/shared";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/shadcn-ui-kit/ui/dropdown-menu";
import { Button } from "@/shadcn-ui-kit/ui/button";

export function ExportButton({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FolderUp /> <span className="hidden lg:inline">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Excel</DropdownMenuItem>
          <DropdownMenuItem>PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
