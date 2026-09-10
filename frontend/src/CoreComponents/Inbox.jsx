"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { format } from "date-fns"
import { Mail, AlertCircle, Search, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import DataPagination from "@/components/DataPagination"

const ITEMS_PER_PAGE = 10

export default function Inbox() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [selectedMessage, setSelectedMessage] = useState(null)

  useEffect(() => {
    fetchInbox()
  }, [])

  const fetchInbox = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get(`/inbox/get_inboxes`)
      if (Array.isArray(response.data)) {
          setMessages(response.data);
        } else {
          setMessages([]);
        }
    } catch (err) {
      setError("Failed to load messages. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = useMemo(
    () => messages.filter(
      (message) =>
        message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.body.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [messages, searchTerm]
  )

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const pageMessages = filteredMessages.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const markAsRead = async (id) => {
    try {
      setMessages(messages.map((msg) => (msg.id === id ? { ...msg, read: true } : msg)))
    } catch (err) {
    }
  }

  const handleMessageClick = (message) => {
    setSelectedMessage(message)
    markAsRead(message.id)
  }

  const closePopup = () => {
    setSelectedMessage(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Inbox</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchInbox} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
              <h3 className="text-lg font-medium">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchInbox}>Try Again</Button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">
                {searchTerm ? "No messages found" : "Your inbox is empty"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "New messages will appear here"}
              </p>
            </div>
          ) : (
            <>
            <div className="space-y-2">
              {pageMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border rounded-md cursor-pointer transition-colors hover:bg-muted ${
                    !message.read ? "border-l-4 border-l-purple-600" : ""
                  }`}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{message.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                
                  <div className="text-sm text-muted-foreground line-clamp-2">{message.body}</div>
                </div>
              ))}
            </div>
            <DataPagination
              page={page}
              totalItems={filteredMessages.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setPage}
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Popup */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Message Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePopup}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{selectedMessage.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedMessage.created_at), "PPP 'at' p")}
                  </div>
                </div>
                {!selectedMessage.read && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    New
                  </Badge>
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-2">Message:</div>
                <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {selectedMessage.body}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t">
              <Button onClick={closePopup}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}