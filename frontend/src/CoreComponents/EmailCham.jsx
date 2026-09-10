"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Send, Calendar, Users, Eye, MousePointer, Upload, Settings, BarChart3,  X } from "lucide-react"

// Mock Campaigns
const mockCampaigns = [
  {
    id: "1",
    name: "Welcome Series",
    subject: "Welcome to our platform!",
    status: "active",
    recipients: 450,
    opens: 230,
    clicks: 45,
    template: "welcome",
  },
  {
    id: "2",
    name: "Product Launch",
    subject: "Introducing our new product",
    status: "scheduled",
    recipients: 1200,
    opens: 0,
    clicks: 0,
    scheduledDate: "2024-01-20",
    template: "announcement",
  },
  {
    id: "3",
    name: "Special Offer",
    subject: "50% off this weekend only",
    status: "sent",
    recipients: 800,
    opens: 420,
    clicks: 89,
    template: "offer",
  },
]

const emailTemplates = [
  { id: "welcome", name: "Welcome Email", description: "Greet new subscribers" },
  { id: "offer", name: "Special Offer", description: "Promotional campaigns" },
  { id: "announcement", name: "Announcement", description: "Product launches, news" },
  { id: "newsletter", name: "Newsletter", description: "Regular updates" },
  { id: "custom", name: "Custom Template", description: "Build from scratch" },
]

export default function EmailCampaigns(setCloseMailForm) {
  const [campaigns, setCampaigns] = useState(mockCampaigns)
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    template: "",
    content: "",
    recipients: "all",
  })
  const [value, setValue] = useState('');


  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "sent":
        return "bg-gray-100 text-gray-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCreateCampaign = () => {
    setShowCreateAlertDialog(false)
    setNewCampaign({ name: "", subject: "", template: "", content: "", recipients: "all" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input placeholder="Search campaigns..." className="w-64" />
          <Select defaultValue="all">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Upload className="h-4 w-4" />
            Import Contacts
          </Button>
          <AlertDialog open={showCreateAlertDialog} onOpenChange={setShowCreateAlertDialog}>
            <AlertDialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Email Campaign
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-2xl">
              
              <AlertDialogHeader>
              <AlertDialogCancel className='w-0'><X/></AlertDialogCancel>
                <AlertDialogTitle>Create Email Campaign</AlertDialogTitle>
              </AlertDialogHeader>

              <Tabs defaultValue="setup" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="setup">Setup</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="campaign-name">Campaign Name</Label>
                      <Input
                        id="campaign-name"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        placeholder="e.g., Welcome Series"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={newCampaign.subject}
                        onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                        placeholder="e.g., Welcome to our platform!"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Choose Template</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {emailTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-colors ${
                            newCampaign.template === template.id ? "ring-2 ring-blue-500" : ""
                          }`}
                          onClick={() => setNewCampaign({ ...newCampaign, template: template.id })}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Recipients</Label>
                    <Select
                      value={newCampaign.recipients}
                      onValueChange={(value) => setNewCampaign({ ...newCampaign, recipients: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contacts (1,234)</SelectItem>
                        <SelectItem value="subscribers">Subscribers Only (890)</SelectItem>
                        <SelectItem value="customers">Customers (456)</SelectItem>
                        <SelectItem value="custom">Custom Segment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label htmlFor="email-content">Email Content</Label>
                  
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Add Image</Button>
                    <Button variant="outline" size="sm">Add Button</Button>
                    <Button variant="outline" size="sm">Personalize</Button>
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Send Option</Label>
                      <Select defaultValue="now">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now">Send Now</SelectItem>
                          <SelectItem value="schedule">Schedule for Later</SelectItem>
                          <SelectItem value="draft">Save as Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="schedule-date">Schedule Date</Label>
                      <Input id="schedule-date" type="datetime-local" disabled />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateAlertDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateCampaign}>Create Campaign</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Campaign List */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{campaign.subject}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {campaign.recipients} recipients
                    </div>
                    {(campaign.status === "sent" || campaign.status === "active") && (
                      <>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {campaign.opens} opens ({Math.round((campaign.opens / campaign.recipients) * 100)}%)
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-4 w-4" />
                          {campaign.clicks} clicks ({Math.round((campaign.clicks / campaign.recipients) * 100)}%)
                        </div>
                      </>
                    )}
                    {campaign.scheduledDate && campaign.status === "scheduled" && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Scheduled for {new Date(campaign.scheduledDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><BarChart3 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button>
                  {campaign.status === "draft" && (
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
