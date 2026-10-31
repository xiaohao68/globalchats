import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ACCESS_TOKEN_KEY } from "@/modules/auth/constants/auth-storage"

export const metadata = {
  title: "Home"
}

export default async function Page() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value

  if (!accessToken) {
    redirect("/console/login")
  }

  redirect("/console/dashboard")
}
