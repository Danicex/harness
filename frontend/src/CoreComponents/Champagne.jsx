"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SmsSender from "./SmsSender"
import EmailComposer from "./TextEditor"

export default function ChampagnesPage() {
  return (
    <main className="min-h-screen  py-8">
      <div className="">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Communication Center</h1>
          <p className="text-muted-foreground">Send SMS messages or emails to multiple recipients</p>
        </div>

        <Tabs defaultValue="sms" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="sms">
            <SmsSender />
          </TabsContent>
          <TabsContent value="email">
            <EmailComposer />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
