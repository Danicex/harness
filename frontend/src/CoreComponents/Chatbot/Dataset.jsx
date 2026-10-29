import { useCallback, useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Turns an axios error (including FastAPI 422 detail arrays) into a readable string
function errMsg(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.slice(1).join(".")}: ${d.msg}`).join("; ");
  }
  return detail || err?.message || "Something went wrong";
}

const blankPair = () => ({ question: "", answer: "" });
const EMPTY = { title: "", description: "", intent: [blankPair()] };

/* ------------------------------ Dialog ------------------------------ */
function DatasetDialog({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            title: initial.title ?? "",
            description: initial.description ?? "",
            intent: initial.intent?.length ? initial.intent : [blankPair()],
          }
        : { ...EMPTY, intent: [blankPair()] }
    );
    setError("");
  }, [open, initial]);

  const setPair = (i, field, value) =>
    setForm((f) => ({
      ...f,
      intent: f.intent.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));

  async function submit(e) {
    e.preventDefault();

    const intent = form.intent
      .map((p) => ({ question: p.question.trim(), answer: p.answer.trim() }))
      .filter((p) => p.question && p.answer);

    if (intent.length === 0) {
      setError("Add at least one question and answer pair.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        intent,
      };
      if (isEdit) await api.put(`/chatbot/dataset/${initial.id}`, body);
      else await api.post("/chatbot/dataset", body);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(errMsg(err));
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
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Questions &amp; answers</Label>
            {form.intent.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Question (e.g. What time is check-out?)"
                    value={p.question}
                    onChange={(e) => setPair(i, "question", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setForm((f) => ({ ...f, intent: f.intent.filter((_, idx) => idx !== i) }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Answer"
                  value={p.answer}
                  onChange={(e) => setPair(i, "answer", e.target.value)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, intent: [...f.intent, blankPair()] }))}
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

/* ------------------------------- Page ------------------------------- */
export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/chatbot/dataset");
      setDatasets(data);
      setError("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (ds) => {
    setEditing(ds);
    setDialogOpen(true);
  };

  async function remove(ds) {
    if (!window.confirm(`Delete "${ds.title}"?`)) return;
    try {
      await api.delete(`/chatbot/dataset/${ds.id}`);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Datasets</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add dataset
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && datasets.length === 0 && (
        <p className="text-sm text-muted-foreground">No datasets yet.</p>
      )}

      <div className="space-y-3">
        {datasets.map((ds) => (
          <div key={ds.id} className="flex items-start justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{ds.title}</p>
              {ds.description && (
                <p className="text-sm text-muted-foreground">{ds.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {ds.intent.length} Q&amp;A pair{ds.intent.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(ds)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(ds)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DatasetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}