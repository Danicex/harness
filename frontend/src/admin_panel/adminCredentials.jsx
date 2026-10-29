// 1. External Libraries
import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";

// 2. UI Components (Shadcn / Design System)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 3. Local Components, Utilities, and API
import adminApi from "@/lib/adminApi";


/**
 * View a user's service credentials, and edit them from the same dialog.
 * Props: open, onOpenChange, adminId, adminName (optional, for the description)
 */
export  function CredentialsDialog({ open, onOpenChange, adminId, adminName }) {
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [data, setData] = useState(null); // latest values from the server (secrets masked)
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load every time the dialog opens, always starting in view mode
  useEffect(() => {
    if (!open || !adminId) return;
    let cancelled = false;
    setMode("view");
    setData(null);
    setError("");
    setLoading(true);
    fetchCredentials(adminId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(errMsg(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, adminId]);

  function startEdit() {
    const next = {};
    ALL_FIELDS.forEach((f) => {
      // Secrets are masked by the server, so they start blank ("blank keeps current")
      next[f.name] = f.secret ? "" : data?.[f.name] ?? "";
    });
    setForm(next);
    setError("");
    setMode("edit");
  }

  function cancelEdit() {
    setError("");
    setMode("view");
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const values = {};
      ALL_FIELDS.forEach((f) => {
        const v = (form[f.name] ?? "").trim();
        if (f.secret) {
          if (v) values[f.name] = v; // blank secret = keep the stored one
        } else {
          values[f.name] = v; // blank clears the field on the server
        }
      });
      const result = await saveCredentials(adminId, values);
      setData(result);
      setMode("view");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit credentials" : "Credentials"}</DialogTitle>
          <DialogDescription>
            Email and SMS service credentials for {adminName ?? "this user"}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading credentials...</span>
          </div>
        ) : mode === "view" ? (
          /* ------------------------------ view ------------------------------ */
          <>
            {error && (
              <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {data && (
              <div className="space-y-6">
                {SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-sm font-medium">{section.title}</h3>
                    {section.fields.map((f) => {
                      const value = data[f.name];
                      return (
                        <div
                          key={f.name}
                          className="flex items-start justify-between gap-4 text-sm"
                        >
                          <span className="text-muted-foreground">{f.label}</span>
                          <span
                            className={`max-w-[60%] break-words text-right ${
                              f.secret ? "font-mono" : "font-medium"
                            }`}
                          >
                            {value || (
                              <span className="font-sans font-normal text-muted-foreground">
                                Not set
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={startEdit} disabled={!data}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ------------------------------ edit ------------------------------ */
          <form onSubmit={submit} className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-sm font-medium">{section.title}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.name} className="space-y-2">
                      <Label htmlFor={`cred-${f.name}`}>{f.label}</Label>
                      <Input
                        id={`cred-${f.name}`}
                        type={f.secret ? "password" : f.type ?? "text"}
                        autoComplete="off"
                        placeholder={
                          f.secret && data?.[f.name]
                            ? `${data[f.name]} (blank keeps current)`
                            : f.placeholder
                        }
                        value={form[f.name] ?? ""}
                        onChange={(e) =>
                          setForm((cur) => ({ ...cur, [f.name]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


/* ------------------------- request functions ------------------------- */
export async function fetchCredentials(adminId) {
  try {
    const { data } = await adminApi.get("/admin/admin_credentials", { params: { admin_id: adminId } });
    return data;
  } catch (err) {
    // no credentials saved yet -> show an empty view and let the admin create them via Edit
    if (err?.response?.status === 404 && err.response.data?.detail !== "Not Found") return {};
    throw err;
  }
}

export async function saveCredentials(adminId, values) {
  const { data } = await adminApi.put("/admin/admin_credentials", { admin_id: adminId, ...values });
  return data;
}

/* ------------------------------ config ------------------------------ */
export const SECTIONS = [
  {
    title: "Resend (email)",
    description: "Used to send emails from your hotel.",
    fields: [
      { name: "resend_api_key", label: "API key", placeholder: "re_...", secret: true },
      { name: "resend_from_email", label: "From email", placeholder: "hello@yourhotel.com", type: "email" },
      { name: "resend_from_name", label: "From name", placeholder: "Grand Hotel" },
      { name: "resend_reply_to", label: "Reply-to email", placeholder: "reservations@yourhotel.com", type: "email" },
    ],
  },
  {
    title: "Africa's Talking (SMS & voice)",
    description: "Used to send SMS and place calls.",
    fields: [
      { name: "at_username", label: "Username", placeholder: "sandbox" },
      { name: "at_api_key", label: "API key", placeholder: "Your Africa's Talking API key", secret: true },
      { name: "at_sender_id", label: "SMS sender ID", placeholder: "GrandHotel" },
      { name: "at_voice_number", label: "Voice number", placeholder: "+2347000000000" },
    ],
  },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const EMPTY = Object.fromEntries(ALL_FIELDS.map((f) => [f.name, ""]));

export function errMsg(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.slice(1).join(".")}: ${d.msg}`).join("; ");
  }
  return detail || err?.message || "Something went wrong";
}

/* ------------------------------ component ------------------------------ */
export function CredentialsForm({ adminId }) {
  const [form, setForm] = useState(EMPTY);
  const [masked, setMasked] = useState({}); // masked secrets from the server, shown as placeholders
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Secrets come back masked, so they are never put into the inputs.
  function applyServerData(data) {
    const next = { ...EMPTY };
    const nextMasked = {};
    ALL_FIELDS.forEach((f) => {
      if (f.secret) nextMasked[f.name] = data?.[f.name] ?? "";
      else next[f.name] = data?.[f.name] ?? "";
    });
    setForm(next);
    setMasked(nextMasked);
  }

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setSaved(false);
    fetchCredentials(adminId)
      .then((data) => !cancelled && applyServerData(data))
      .catch((err) => !cancelled && setError(errMsg(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [adminId]);

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setSaved(false);
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const values = {};
      ALL_FIELDS.forEach((f) => {
        const v = form[f.name].trim();
        if (f.secret) {
          if (v) values[f.name] = v; // blank secret = keep the stored one
        } else {
          values[f.name] = v; // blank clears the field on the server
        }
      });
      const data = await saveCredentials(adminId, values);
      applyServerData(data);
      setSaved(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (!adminId) {
    return <p className="text-sm text-muted-foreground">No admin selected.</p>;
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={submit}>
        <CardHeader>
          <CardTitle>Service credentials</CardTitle>
          <CardDescription>
            All fields are optional. Leave a key blank to keep the one already saved.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            SECTIONS.map((section) => (
              <div key={section.title} className="space-y-4">
                <div>
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.name} className="space-y-2">
                      <Label htmlFor={f.name}>{f.label}</Label>
                      <Input
                        id={f.name}
                        type={f.secret ? "password" : f.type ?? "text"}
                        autoComplete="off"
                        placeholder={
                          f.secret && masked[f.name]
                            ? `${masked[f.name]} (blank keeps current)`
                            : f.placeholder
                        }
                        value={form[f.name]}
                        onChange={(e) => setField(f.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>

        <CardFooter className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={loading || saving}>
            {saving ? "Saving…" : "Save credentials"}
          </Button>
          {saved && <p className="text-sm text-green-600">Saved.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardFooter>
      </form>
    </Card>
  );
}