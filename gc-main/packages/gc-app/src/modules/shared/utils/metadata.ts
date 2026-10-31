import { Metadata } from "next"

interface GenerateMetaInput {
  title: string
  description: string
  canonical: string
}

export function generateMeta({ title, description, canonical }: GenerateMetaInput): Metadata {
  return {
    title: `${title} - Globalchats`,
    description,
    metadataBase: new URL("https://globalchats.org"),
    alternates: {
      canonical: `/console/dashboard${canonical}`
    },
    openGraph: {
      images: ["/images/seo.jpg"]
    }
  }
}
