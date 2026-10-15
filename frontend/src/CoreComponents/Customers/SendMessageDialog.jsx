// Reusable "compose & send" dialog used wherever a list of customers needs
// a quick mail or SMS sent to them (right now: Customer Management table).
//
// Two small functions do the actual sending — send_mail / send_sms — kept
// at the bottom of this file so they can also be imported and reused
// directly if another page ever needs to fire a message without the dialog UI.
import React, { useEffect, useState } from "react"
import { Loader2, Send, Mail, MessageSquareText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useMyContext } from "@/Context/AppContext"
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

/** POST the given recipients + subject/body to the mail-campaign endpoint. */
export async function send_mail({ emails, subject, body, from_email = null }) {
  // If emails is an array, join with commas; if it's a string, use as-is
  const recipients = Array.isArray(emails) ? emails.join(',') : emails;
  
  const formData = new FormData();
  formData.append('to', recipients);
  formData.append('subject', subject);
  formData.append('html', body);
  
  if (from_email) {
    formData.append('from_email', from_email);
  }

  return api.post(`/task/send_mail`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

const modules = {
  toolbar: [
    [{ font: [] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ header: [1, 2, 3, false] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

/** POST the given recipients + message to the SMS-campaign endpoint. */
export async function send_sms({ recipients, message, sender = null }) {
  // recipients should be an array of phone numbers
  const formData = new FormData();
  formData.append('recipients', JSON.stringify(recipients));
  formData.append('message', message);
  formData.append('sender', sender || 'HotelApp');
  
  return api.post(`/bulk_send_sms`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * mode: "mail" | "sms"
 * recipients: array of customer objects ({ email, phone, customer_name, ... })
 */
export default function SendMessageDialog({ open, onOpenChange, mode, recipients = [] }) {
  const { admin_id } = useMyContext()
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const isMail = mode === "mail"

  // Extract emails from recipients array
  const emailList = recipients
    .map(recipient => recipient.email)
    .filter(email => email && email.trim() !== '');
  
  // Extract phone numbers from recipients array
  const phoneList = recipients
    .map(recipient => recipient.phone)
    .filter(phone => phone && phone.trim() !== '');

  // Reset the form each time the dialog opens for a fresh set of recipients
  useEffect(() => {
    if (open) {
      setSubject("")
      setBody("")
    }
  }, [open, mode])

  const validRecipients = isMail
    ? recipients.filter((c) => !!c.email).map((c) => c.email)
    : recipients.filter((c) => !!c.phone).map((c) => c.phone)

  const missingCount = recipients.length - validRecipients.length

  const handleSend = async () => {
    if (!body.trim()) {
      toast({
        title: "Message required",
        description: `Please write a ${isMail ? "message" : "SMS"} body before sending`,
        variant: "destructive",
      })
      return
    }
    if (validRecipients.length === 0) {
      toast({
        title: "No recipients",
        description: `Selected customers don't have a valid ${isMail ? "email" : "phone number"}`,
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      if (isMail) {
        // Pass the array of emails directly to send_mail
        await send_mail({ 
          emails: validRecipients, 
          subject, 
          body 
        })
      } else {
        // Pass the array of phone numbers directly to send_sms
        await send_sms({ 
          recipients: validRecipients, 
          message: body 
        })
      }

      toast({
        title: isMail ? "Mail sent" : "SMS sent",
        description: `Sent to ${validRecipients.length} customer${validRecipients.length !== 1 ? "s" : ""}`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Send failed",
        description: error.response?.data?.detail || `Failed to send ${isMail ? "mail" : "SMS"}`,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMail ? <Mail className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
            {isMail ? "Send Email" : "Send SMS"}
          </DialogTitle>
          <DialogDescription>
            Sending to {validRecipients.length} customer{validRecipients.length !== 1 ? "s" : ""}
            {missingCount > 0 && (
              <span className="text-amber-600">
                {" "}
                ({missingCount} skipped — no {isMail ? "email" : "phone number"} on file)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <div className="flex flex-wrap gap-1 rounded-md border bg-muted/30 p-2 max-h-20 overflow-y-auto text-sm text-muted-foreground">
              {validRecipients.length > 0 ? validRecipients.join(", ") : "No valid recipients"}
            </div>
          </div>

          {isMail && (
            <div>
              <Label htmlFor="msg-subject">Subject</Label>
              <Input
                id="msg-subject"
                placeholder="Enter subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="msg-body">{isMail ? "Message" : "SMS message"}</Label>
            <div className="mt-2">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={modules}
              />
            </div>
            {!isMail && (
              <p className="text-xs text-muted-foreground mt-1">
                {body.length} characters
                {body.length > 160 && ` (≈ ${Math.ceil(body.length / 160)} SMS segments)`}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSending ? "Sending..." : isMail ? "Send Email" : "Send SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}