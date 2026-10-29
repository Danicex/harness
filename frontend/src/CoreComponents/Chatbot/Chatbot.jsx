import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

// admin_id comes from ?admin=1 in the URL, or localStorage
const getAdminId = () =>
  Number(new URLSearchParams(window.location.search).get("admin") ?? localStorage.getItem("admin_id"));

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! Welcome. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

   async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chatbot/chat", {
        admin_id: getAdminId(),
        user_input: text,
      });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.slice(1).join(".")}: ${d.msg}`).join("; ")
        : detail || err?.message || "Unknown error";
      setMessages((m) => [...m, { role: "assistant", text: `Sorry, something went wrong: ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0); // wait for the input to re-enable
    }
  }

  return (
    <div className="flex min-h-[500px] max-w-2xl">
      <Card className="flex w-full flex-col">
        <CardHeader>
          <CardTitle>Hotel Receptionist</CardTitle>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-muted-foreground">Typing…</div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex gap-2">
            <Input
  ref={inputRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder="Ask about rooms, prices, amenities…"
  disabled={loading}
/>
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}