"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMyContext } from "@/Context/AppContext";

export default function InboxPage() {
  const [formData, setFormData] = useState({
    email: "",
    body: "",
  });
  const {admin_id} = useMyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

 const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Method 1: Using FormData (matches your current backend)
      const formDataObj = new FormData();
      if (formData.email) formDataObj.append("email", formData.email);
      if (formData.body) formDataObj.append("body", formData.body);
      
      await api.post(
        `/inbox/create_inbox/${admin_id}`,
        formDataObj,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      setFormData({ email: "", body: "" });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert(error.response?.data?.detail || "Something went wrong while sending your message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131313] rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center text-gray-200">
          Send Inbox Message
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Message</label>
            <Textarea
              name="body"
              placeholder="Write your message here..."
              value={formData.body}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Inbox"}
          </Button>
        </form>
      </div>

      {/* ✅ Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message Sent</DialogTitle>
            <DialogDescription>
              🎉 Thanks for dropping an inbox. We’ll get back to you soon.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccess(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
