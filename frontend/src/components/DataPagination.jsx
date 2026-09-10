import React from "react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

/**
 * Reusable pagination control for any list page.
 *
 * Usage:
 *   const [page, setPage] = useState(1)
 *   const perPage = 10
 *   const pageItems = items.slice((page - 1) * perPage, page * perPage)
 *   <DataPagination page={page} totalItems={items.length} perPage={perPage} onPageChange={setPage} />
 */
export default function DataPagination({ page, totalItems, perPage = 10, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))

  if (totalPages <= 1) return null

  const pageNumbers = (() => {
    const count = Math.min(5, totalPages)
    let start
    if (totalPages <= 5) start = 1
    else if (page <= 3) start = 1
    else if (page >= totalPages - 2) start = totalPages - 4
    else start = page - 2
    return Array.from({ length: count }, (_, i) => start + i)
  })()

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            className={page === 1 ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => {
              e.preventDefault()
              if (page > 1) onPageChange(page - 1)
            }}
          />
        </PaginationItem>

        {pageNumbers[0] > 1 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {pageNumbers.map((pageNum) => (
          <PaginationItem key={pageNum}>
            <PaginationLink
              href="#"
              isActive={page === pageNum}
              onClick={(e) => {
                e.preventDefault()
                onPageChange(pageNum)
              }}
            >
              {pageNum}
            </PaginationLink>
          </PaginationItem>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            className={page === totalPages ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => {
              e.preventDefault()
              if (page < totalPages) onPageChange(page + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
