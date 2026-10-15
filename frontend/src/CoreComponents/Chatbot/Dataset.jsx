import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";

const EMPTY = { title: "", description: "", intent: [{ question: "", answer: "" }] };

function DatasetDialog({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(initial);

  // reset form each time the dialog opens
  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial, description: initial.description ?? "" } : EMPTY);
      setError("");
    }
  }, [open, initial]);

  const setIntent = (i, field, value) =>
    setForm((f) => ({
      ...f,
      intent: f.intent.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)),
    }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        intent: form.intent.filter((i) => i.question.trim() && i.answer.trim()),
      };
      await api("/chatbot/dataset", { method: isEdit ? "PUT" : "POST", body });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit dataset" : "Add dataset"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <Label>Questions &amp; answers</Label>
            {form.intent.map((it, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Question (e.g. What time is check-out?)"
                    value={it.question}
                    onChange={(e) => setIntent(i, "question", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm((f) => ({ ...f, intent: f.intent.filter((_, idx) => idx !== i) }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Answer"
                  value={it.answer}
                  onChange={(e) => setIntent(i, "answer", e.target.value)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, intent: [...f.intent, { question: "", answer: "" }] }))}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Q&amp;A
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DatasetPage() {
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setDataset(await api("/chatbot/dataset"));
    } catch (err) {
      if (err.status === 404) setDataset(null);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove() {
    if (!window.confirm("Delete this dataset? The chatbot will lose this knowledge.")) return;
    try {
      await api("/chatbot/dataset", { method: "DELETE" });
      setDataset(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chatbot dataset</h1>
        {!dataset && !loading && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add dataset
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && !dataset && !error && (
        <p className="text-sm text-muted-foreground">
          No dataset yet. Add one to teach the receptionist about your hotel.
        </p>
      )}

      {dataset && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{dataset.title}</CardTitle>
              {dataset.description && <CardDescription>{dataset.description}</CardDescription>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setDialogOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={remove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dataset.intent ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No Q&amp;A entries.</p>
            )}
            {(dataset.intent ?? []).map((it, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{it.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{it.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DatasetDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={dataset} onSaved={load} />
    </div>
  );
}