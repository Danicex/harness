// Campaign History page.
// Shows past SMS / Email campaigns sent to customers.
// Backed by dummy data for now — swap fetchCampaignHistory() for a real
// api.get("/campaign/history") call once that endpoint exists.
import React, { useMemo, useState } from "react"
import { Mail, MessageSquareText, Eye, MousePointerClick, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import DataPagination from "@/components/DataPagination"

const ITEMS_PER_PAGE = 8

// --- Dummy data -------------------------------------------------------
// Replace with a real fetch once the backend exposes campaign history.
const DUMMY_CAMPAIGNS = [
  { id: 1, type: "mail", title: "Welcome Series", recipients: 450, delivered: 442, opens: 230, clicks: 45, sent_at: "2026-06-20T09:15:00Z" },
  { id: 2, type: "sms", title: "Weekend Discount Alert", recipients: 320, delivered: 318, opens: null, clicks: null, sent_at: "2026-06-18T14:30:00Z" },
  { id: 3, type: "mail", title: "Loyalty Program Launch", recipients: 1200, delivered: 1185, opens: 640, clicks: 120, sent_at: "2026-06-15T11:00:00Z" },
  { id: 4, type: "sms", title: "Booking Confirmation Reminder", recipients: 85, delivered: 85, opens: null, clicks: null, sent_at: "2026-06-12T08:45:00Z" },
  { id: 5, type: "mail", title: "Special Offer - 50% Off", recipients: 800, delivered: 790, opens: 420, clicks: 89, sent_at: "2026-06-10T16:20:00Z" },
  { id: 6, type: "sms", title: "Checkout Thank You", recipients: 210, delivered: 205, opens: null, clicks: null, sent_at: "2026-06-08T10:05:00Z" },
  { id: 7, type: "mail", title: "Holiday Season Greetings", recipients: 1500, delivered: 1470, opens: 980, clicks: 210, sent_at: "2026-06-05T09:00:00Z" },
  { id: 8, type: "sms", title: "Room Upgrade Promo", recipients: 150, delivered: 148, opens: null, clicks: null, sent_at: "2026-06-02T13:10:00Z" },
  { id: 9, type: "mail", title: "Customer Feedback Survey", recipients: 600, delivered: 590, opens: 310, clicks: 75, sent_at: "2026-05-28T15:40:00Z" },
  { id: 10, type: "sms", title: "New Spa Services", recipients: 275, delivered: 270, opens: null, clicks: null, sent_at: "2026-05-25T12:00:00Z" },
  { id: 11, type: "mail", title: "Referral Program", recipients: 980, delivered: 960, opens: 520, clicks: 140, sent_at: "2026-05-20T09:30:00Z" },
  { id: 12, type: "sms", title: "Late Checkout Offer", recipients: 95, delivered: 95, opens: null, clicks: null, sent_at: "2026-05-15T08:00:00Z" },
]

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function CampaignHistory() {
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)

  // Swap this for a real fetch later:
  // const [campaigns, setCampaigns] = useState([])
  // useEffect(() => { api.get("/campaign/history").then(res => setCampaigns(res.data)) }, [])
  const campaigns = DUMMY_CAMPAIGNS

  const filtered = useMemo(() => {
    if (typeFilter === "all") return campaigns
    return campaigns.filter((c) => c.type === typeFilter)
  }, [campaigns, typeFilter])

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => {
        acc.recipients += c.recipients
        acc.mail += c.type === "mail" ? 1 : 0
        acc.sms += c.type === "sms" ? 1 : 0
        return acc
      },
      { recipients: 0, mail: 0, sms: 0 }
    )
  }, [campaigns])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaign History</h1>
        <p className="text-muted-foreground mt-1">
          A record of every mail and SMS campaign sent to your customers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totals.recipients.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total recipients reached</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totals.mail}</p>
              <p className="text-sm text-muted-foreground">Email campaigns sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totals.sms}</p>
              <p className="text-sm text-muted-foreground">SMS campaigns sent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Showing dummy data until the campaign history endpoint is wired up</CardDescription>
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mail">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {c.type === "mail" ? <Mail className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
                          {c.type === "mail" ? "Email" : "SMS"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>{c.recipients.toLocaleString()}</TableCell>
                      <TableCell>{c.delivered.toLocaleString()}</TableCell>
                      <TableCell>
                        {c.opens != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.opens} ({Math.round((c.opens / c.recipients) * 100)}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.clicks != null ? (
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.clicks} ({Math.round((c.clicks / c.recipients) * 100)}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-nowrap">{formatDate(c.sent_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            page={page}
            totalItems={filtered.length}
            perPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
