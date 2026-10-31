import * as React from "react"
import AggregateInbox from "@/modules/im/components/aggregate/aggregate-inbox"

export default function ImAggregatePage() {
  return (
    <React.Suspense fallback={<div className="py-4 text-center">Loading...</div>}>
      <AggregateInbox />
    </React.Suspense>
  )
}
