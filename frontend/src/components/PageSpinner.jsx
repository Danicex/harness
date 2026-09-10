import React from "react"
import { Loader2 } from "lucide-react"

/**
 * Fallback UI shown by <Suspense> while a lazy-loaded page chunk downloads.
 * Usage: <Suspense fallback={<PageSpinner />}><LazyPage /></Suspense>
 */
export default function PageSpinner({ label = "Loading..." }) {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
