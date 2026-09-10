"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader } from "@/components/ui/card"
import { FileUp, Database, EllipsisVertical, Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import api from "@/lib/api"
import { useMyContext } from "@/Context/AppContext"

export default function SmsSender() {
  const [phoneNumbers, setPhoneNumbers] = useState("")
  const [message, setMessage] = useState("")
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef(null)
  const { toast } = useToast()
  const { admin_id } = useMyContext()

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      const numbers = lines
        .map((line) => line.split(",")[0].trim())
        .filter((num) => num && /[\d\s\-+()]+/.test(num))

      setSelectedNumbers((prev) => [...new Set([...prev, ...numbers])])
      setPhoneNumbers((prev) =>
        prev ? `${prev}, ${numbers.join(", ")}` : numbers.join(", ")
      )

      toast({
        title: "CSV uploaded",
        description: `Added ${numbers.length} phone numbers`,
      })
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to read CSV file",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const fetchNumbersFromDatabase = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/get_mails/${admin_id}`)
      const numbers = Array.isArray(response.data) ? response.data : []
      setSelectedNumbers((prev) => [...new Set([...prev, ...numbers])])
      setPhoneNumbers(numbers.join(", "))

      toast({
        title: "Numbers fetched",
        description: `Retrieved ${numbers.length} phone numbers from database`,
      })
    } catch {
      toast({
        title: "Fetch failed",
        description: "Failed to retrieve phone numbers from database",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendSMS = async () => {
    if (!phoneNumbers.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both phone numbers and a message",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      const numbers = phoneNumbers
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)

      await api.post(`/send_sms/${admin_id}`, {
        phone_numbers: numbers,
        message,
      })

      toast({
        title: "SMS sent successfully",
        description: `Message sent to ${
          selectedNumbers.length || numbers.length || 1
        } recipient(s)`,
      })

      setPhoneNumbers("")
      setMessage("")
      setSelectedNumbers([])
    } catch {
      toast({
        title: "Send failed",
        description: "Failed to send SMS messages",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="overflow-hidden">
        <CardHeader className="text-xl font-semibold  py-4">New SMS Message</CardHeader>
        <div className="flex items-center border-b px-6 py-3">
          <label className="w-16 text-sm text-muted-foreground">To</label>
          <Input
            type="text"
            placeholder="+1234567890, +0987654321"
            value={phoneNumbers}
            onChange={(e) => {
              setPhoneNumbers(e.target.value)
              const nums = e.target.value
                .split(",")
                .map((n) => n.trim())
                .filter(Boolean)
              setSelectedNumbers(nums)
            }}
            className="border-0 shadow-none focus-visible:ring-0 flex-1"
          />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <EllipsisVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={triggerFileInput}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload CSV file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={fetchNumbersFromDatabase}>
                <Database className="mr-2 h-4 w-4" />
                Get numbers from database
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedNumbers.length > 0 && (
            <div className="ml-2 text-xs text-muted-foreground">
              {selectedNumbers.length} recipient
              {selectedNumbers.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="border-b">
          <Textarea
            placeholder="Type your SMS message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[300px] border-0 shadow-none focus-visible:ring-0 resize-none px-6 py-4"
          />
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-muted/50">
          <div className="text-xs text-muted-foreground">
            {message.length} characters{" "}
            {message.length > 160 && (
              <span className="text-amber-600">
                (≈ {Math.ceil(message.length / 160)} SMS segments)
              </span>
            )}
          </div>
          <Button
            onClick={handleSendSMS}
            disabled={
              isSending || !phoneNumbers.trim() || !message.trim()
            }
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send SMS
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
