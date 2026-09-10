// Custom chatbot page for the dashboard.
// Sends each message to /chatbot/message via the shared api instance and
// renders the conversation thread. Swap the endpoint path if your backend
// uses a different route — everything else (UI, history, loading state)
// stays the same.
import React, { useEffect, useRef, useState } from "react";
import { 
  AlertCircle,
  Bot, 
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Loader2, 
  MessagesSquare,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send, 
  Sparkles, 
  Trash2,
  User, 
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMyContext } from "@/Context/AppContext";
import { AlertDialogDescription } from "@radix-ui/react-alert-dialog";

const SUGGESTED_PROMPTS = [
  "How many rooms are currently available?",
  "Summarize today's bookings",
  "Draft a follow-up message for a guest who just checked out",
]

function ChatBubble({ message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

const Dataset = () => {
  const [isOpen, setIsOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const [datasetForm, setDatasetForm] = useState({
    id: null,
    title: "",
    description: "",
    intent: [{ intent: "", answer: "" }],
  });

  useEffect(() => {
    get_dataset();
  }, []);

  const get_dataset = async () => {
    try {
      const res = await api.get("/dataset/get_dataset");
      setDatasets(Array.isArray(res.data) ? res.data  : []);
      console.log(res.data)
    } catch (err) {
      console.log(err);
    }
  };

  const resetForm = () => {
    setDatasetForm({
      id: null,
      title: "",
      description: "",
      intent: [{ intent: "", answer: "" }],
    });
  };

  const handleChange = (key, value) => {
    setDatasetForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleIntentChange = (index, key, value) => {
    const intents = [...datasetForm.intent];
    intents[index][key] = value;

    setDatasetForm((prev) => ({
      ...prev,
      intent: intents,
    }));
  };

  const addIntent = () => {
    setDatasetForm((prev) => ({
      ...prev,
      intent: [...prev.intent, { intent: "", answer: "" }],
    }));
  };

  const removeIntent = (index) => {
    if (datasetForm.intent.length === 1) return;

    setDatasetForm((prev) => ({
      ...prev,
      intent: prev.intent.filter((_, i) => i !== index),
    }));
  };

  const add_dataset = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", datasetForm.title);
      formData.append("description", datasetForm.description);
      formData.append("intent", JSON.stringify(datasetForm.intent));

      await api.post("/dataset/create_dataset", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      resetForm();
      setIsOpen(false);
      get_dataset();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const update_dataset = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", datasetForm.title);
      formData.append("description", datasetForm.description);
      formData.append("intent", JSON.stringify(datasetForm.intent));

      await api.put(
        `/dataset/update_dataset/${datasetForm.id}`,
        formData
      );

      resetForm();
      setIsOpen(false);
      get_dataset();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const editDataset = (item) => {
    setDatasetForm({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      intent:
        item.intent?.length > 0
          ? item.intent
          : [{ intent: "", answer: "" }],
    });

    setIsOpen(true);
  };

  const delete_dataset = async (id) => {
    try {
      await api.delete(`/dataset/delete_dataset/${id}`);
      get_dataset();
    } catch (err) {
      console.log(err);
    }
  };

  return (
  <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Datasets</h1>
          <p className="text-sm text-muted-foreground">
            Train your hotel AI
          </p>
        </div>
        
        {!isOpen && (
          <Button 
            onClick={() => setIsOpen(true)}
            className="shadow-sm hover:shadow transition-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-2 shadow-lg container max-w-2xl">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {datasetForm.id ? "Update Dataset" : "Create New Dataset"}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {datasetForm.id ? "Editing" : "New"}
                  </Badge>
                </div>
                <CardDescription>
                  {datasetForm.id 
                    ? "Update the dataset details and intent mappings" 
                    : "Add a new dataset with its associated intents"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 pt-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Basic Information</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Customer Support Queries"
                      value={datasetForm.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className="focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Describe the purpose and scope of this dataset"
                      value={datasetForm.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      className="resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <p className="text-xs text-muted-foreground">
                      {datasetForm.description.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Intents Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <MessagesSquare className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        Intents & Answers
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {datasetForm.intent.length}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addIntent}
                      className="hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Add Intent
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                      {datasetForm.intent.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Card className="relative border-2 hover:border-primary/20 transition-colors">
                            <CardContent className="space-y-4 pt-6">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Intent #{index + 1}
                                </span>
                                {datasetForm.intent.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeIntent(index)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Intent
                                </Label>
                                <Input
                                  placeholder="e.g., Check Order Status"
                                  value={item.intent}
                                  onChange={(e) =>
                                    handleIntentChange(index, "intent", e.target.value)
                                  }
                                  className="focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Answer
                                </Label>
                                <Textarea
                                  rows={3}
                                  placeholder="Provide the response for this intent"
                                  value={item.answer}
                                  onChange={(e) =>
                                    handleIntentChange(index, "answer", e.target.value)
                                  }
                                  className="resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    disabled={loading || !datasetForm.title.trim()}
                    onClick={datasetForm.id ? update_dataset : add_dataset}
                    className="shadow-sm hover:shadow transition-shadow"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {datasetForm.id ? "Update Dataset" : "Save Dataset"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsOpen(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>

                  {datasetForm.id && (
                    <Button
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => {
                        resetForm();
                        setIsOpen(false);
                      }}
                    >
                      Discard Changes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {datasets.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-16 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No datasets yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create your first dataset to get started with training
                  </p>
                  <Button 
                    onClick={() => setIsOpen(true)} 
                    className="mt-6 shadow-sm hover:shadow transition-shadow"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Dataset
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {datasets.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group hover:border-primary/30 transition-all hover:shadow-md">
                      <CardContent className="flex items-start justify-between pt-6">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => editDataset(item)}
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteId(item.id)}
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 pt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.intent?.length || 0} intents
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Updated {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Dataset?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the dataset
              and all associated intents.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                delete_dataset(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Dataset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your hotel assistant. Ask me about bookings, rooms, customers, or anything else you need help with.",
    },
  ])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef(null)
  const { toast } = useToast()
  const { admin_id } = useMyContext()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isSending])

  const sendMessage = async (text) => {
    const content = text.trim()
    if (!content || isSending) return

    const userMessage = { role: "user", content }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsSending(true)

    try {
      const res = await api.post("/chatbot/message", {
        admin_id,
        message: content,
        // Send recent history so the backend can keep context.
        history: messages.slice(-10),
      })

      const replyText =
        res.data?.reply ??
        res.data?.message ??
        "Sorry, I didn't get a response from the assistant."

      setMessages((prev) => [...prev, { role: "assistant", content: replyText }])
    } catch (error) {
      toast({
        title: "Chatbot unavailable",
        description: error.response?.data?.detail || "Could not reach the chatbot service",
        variant: "destructive",
      })
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again shortly." },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your hotel assistant. Ask me about bookings, rooms, customers, or anything else you need help with.",
      },
    ])
  }

  return (
    <div className="container max-w-2xl">
      <Card className="flex h-[75vh] flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Assistant</CardTitle>
              <CardDescription>Ask anything about your hotel operations</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" title="Reset conversation" onClick={resetChat}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <CardContent className="space-y-4 py-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !input.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function RenderChatBot(){
  return(
    <div className="flex flex-wrap justify-between">
      <Dataset/>
      <ChatbotPage/>
    </div>
  )
}

