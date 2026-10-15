import React from "react";
import { MessageSquare, Database, Bot } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ChatPage from "./Chatbot";
import DatasetPage from "./Dataset";

const ChatBotWrapper = () => {
  return (
    <div className=" bg-muted/30">
      <div className=" max-w-3xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Receptionist</h1>
            <p className="text-sm text-muted-foreground">
              Chat with your assistant and manage what it knows.
            </p>
          </div>
        </header>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-80">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Chat
            </TabsTrigger>
            <TabsTrigger value="dataset" className="gap-2">
              <Database className="h-4 w-4" /> Dataset
            </TabsTrigger>
          </TabsList>

          {/* forceMount keeps the conversation alive when switching tabs */}
          <TabsContent
            value="chat"
            forceMount
            className="mt-4 data-[state=inactive]:hidden"
          >
            <ChatPage />
          </TabsContent>

          <TabsContent value="dataset" className="mt-4">
            <DatasetPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatBotWrapper;
