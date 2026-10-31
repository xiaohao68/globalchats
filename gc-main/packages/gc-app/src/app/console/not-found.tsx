import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/shadcn-ui-kit/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 - Page Not Found"
}

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold tracking-tighter">404</h1>
        <p className="text-muted-foreground mt-4 text-xl">Page not found</p>
        <p className="text-muted-foreground mt-2 text-sm">
          The page you are looking for does not exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/console/dashboard">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  )
}
