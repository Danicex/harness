"use client"

// React
import React, { useState, useEffect, useMemo } from "react"

// Date utilities
import {addMonths,differenceInCalendarDays,eachDayOfInterval,endOfMonth,endOfWeek,format,isSameDay,isSameMonth,parseISO,startOfDay,startOfMonth,startOfWeek,subMonths,
} from "date-fns"

// Icons
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, CalendarDays, CalendarX2, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Clock, Flag, FilterX, LayoutGrid, LayoutList, Loader2, MoreVertical, MousePointerClick, Pencil, Search, TableProperties, Trash2, User, X, Check, ChevronsUpDown,
} from "lucide-react"

// Third-Party Libraries
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Local Utilities / API
import api from "@/lib/api" // your axios instance
import { cn } from "@/lib/utils"

// UI Components (shadcn/ui)
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TaskManagement() {
  const [show, setShow] = useState(false)
  return (
    <div className="container mx-auto">
      <Button onClick={()=>setShow(!show)}>Create Task</Button>
      {show && (
        <div className='absolute left-0 right-0 z-50 top-0'>
           <CreateTaskForm setShow={setShow}/>
        </div>
      )}
      <RenderTask />
    </div>
  )
}

/* ------------------------------ schema ------------------------------ */
const formSchema = z.object({
  task_title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  // assigned_staff is now an object (picked from the staff list), not a free-text string
  assigned_staff: z
    .object({
      id: z.union([z.number(), z.string()]),
      name: z.string(),
      role: z.string().optional(),
    })
    .refine((s) => s.name.length > 0, { message: "Please assign a staff member." }),
  department: z.string().min(1, { message: "Please select a department." }),
  priority: z.string().min(1, { message: "Please select a priority level." }),
  due_date: z.string().min(1, { message: "Please select a due date." }),
  due_time: z.string().min(1, { message: "Please select a due time." }),
  status: z.string().min(1, { message: "Please select a status." }),
})

/* --------------------- departments + role matching --------------------- */
// `aliases` are matched against the staff member's `role` text.
// Edit these to fit the role names you actually use for staff.
const DEPARTMENTS = [
  { value: "management", label: "General Management", aliases: ["general manager", "management"] },
  { value: "hr", label: "Human Resources", aliases: ["hr", "human resources"] },
  { value: "finance", label: "Finance & Revenue", aliases: ["finance", "accountant", "accounts", "cashier"] },
  { value: "front_desk", label: "Front Desk & Reception", aliases: ["front desk", "reception", "receptionist"] },
  { value: "concierge", label: "Concierge & Guest Services", aliases: ["concierge", "guest service", "bellboy", "bellman", "porter"] },
  { value: "housekeeping", label: "Housekeeping", aliases: ["housekeep", "cleaner", "laundry"] },
  { value: "kitchen_culinary", label: "Kitchen & Culinary", aliases: ["chef", "cook", "kitchen", "culinary"] },
  { value: "food_beverage", label: "Food & Beverage Service", aliases: ["waiter", "waitress", "bartender", "barista", "food", "beverage"] },
  { value: "maintenance", label: "Maintenance & Engineering", aliases: ["maintenance", "engineer", "technician", "plumber", "electrician"] },
  { value: "security", label: "Security", aliases: ["security", "guard"] },
]

const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()

// returns a department value, or "" if the role doesn't map to one
const matchDepartment = (role) => {
  const r = normalize(role)
  if (!r) return ""
  const hit = DEPARTMENTS.find(
    (d) => normalize(d.value) === r || normalize(d.label) === r || d.aliases.some((a) => r.includes(a))
  )
  return hit?.value ?? ""
}

/* ------------------------- staff combobox ------------------------- */
function StaffCombobox({ staff, value, onSelect, loading }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Filter by staff NAME only (cmdk's built-in filter is off so ids/roles don't match)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? staff.filter((s) => s.name?.toLowerCase().includes(q)) : staff
  }, [staff, search])

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", !value?.name && "text-muted-foreground")}
          >
            <span className="truncate">{value?.name || (loading ? "Loading staff…" : "Select staff")}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>

      <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search staff by name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No staff found.</p>
            )}
            <CommandGroup>
              {filtered.map((s) => (
                <CommandItem
                  key={s.id}
                  value={String(s.id)}
                  onSelect={() => {
                    onSelect(s)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === s.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{s.name}</span>
                    {s.role && <span className="text-xs text-muted-foreground">{s.role}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* ---------------------------- main form ---------------------------- */
export function CreateTaskForm({ setShow, onCreated }) {
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_title: "",
      description: "",
      assigned_staff: { name: "", id: "", role: "" },
      department: "",
      priority: "",
      due_date: "",
      due_time: "",
      status: "pending",
    },
  })

  // get staff
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get("/staff/get_staff")
        const data = res.data // axios response: the list lives in .data
        if (alive) setStaffList(Array.isArray(data) ? data : data?.staff ?? [])
      } catch (err) {
        console.error("Error fetching staff:", err)
      } finally {
        if (alive) setStaffLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // picking a staff member fills assigned_staff AND department
  const handleStaffSelect = (s) => {
    form.setValue(
      "assigned_staff",
      { id: s.id, name: s.name, role: s.role ?? "" },
      { shouldValidate: true, shouldDirty: true }
    )
    const dept = matchDepartment(s.role)
    if (dept) form.setValue("department", dept, { shouldValidate: true, shouldDirty: true })
  }

  const resetForm = () => {
    form.reset() // back to defaultValues
    setShow(false) // close the modal
  }

  async function onSubmit(values) {
    try {
     const  staff_data ={
  name: values.assigned_staff.name,
  id: values.assigned_staff.id,
  role: values.assigned_staff.role,
}
const x  = JSON.stringify(staff_data)
      const payload = {
        task_title: values.task_title.trim(),
        description: values.description?.trim() || null,
        department: values.department,
        assigned_staff: x,
        // backend stores the staff NAME (string)
        priority: values.priority, // "low" | "medium" | "high"
        status: values.status, // "pending" | "in progress" | "completed"
        due_date: values.due_date, // "YYYY-MM-DD"
        due_time: values.due_time || null, // "HH:MM" or null
      }

      const response = await api.post("task/create_task", payload)
      onCreated?.(response.data.task)
      resetForm()
    } catch (error) {
      console.error("Submission failed:", error.response?.data?.detail ?? error)
    }
  }

  return (
    <Form {...form}>
      <div className="bg-black/50">
        <form onSubmit={form.handleSubmit(onSubmit)} >
          <Card className="mx-auto max-w-2xl space-y-6 rounded-lg border p-6">
            <X onClick={() => setShow(false)} className="float-right cursor-pointer" />
            <h2 className="mb-4 text-2xl font-bold">Create New Task</h2>

            {/* Task Title */}
            <FormField
              control={form.control}
              name="task_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the task details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Assigned Staff (command list) */}
              <FormField
                control={form.control}
                name="assigned_staff"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assigned Staff</FormLabel>
                    <StaffCombobox
                      staff={staffList}
                      value={field.value}
                      onSelect={handleStaffSelect}
                      loading={staffLoading}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    {/* `value` (not defaultValue) so setValue() from the staff picker updates the display */}
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Time */}
              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      {/* space, not underscore: the API rejects "in_progress" */}
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create Task"}
            </Button>
          </Card>
        </form>
      </div>
    </Form>
  )
}
// dummy-tasks.js
export const dummyTasks = [
  {
    task_title: "Design new landing page",
    "Task title": "Design new landing page",
    description: "Create wireframes and high-fidelity mockups for the Q4 campaign landing page.",
    Description: "Create wireframes and high-fidelity mockups for the Q4 campaign landing page.",
    department: "Design",
    Department: "Design",
    assigned_staff: "Amara Okafor",
    "Assigned staff": "Amara Okafor",
    priority: "high",
    Priority: "high",
    due_date: "2026-09-01",
    "Due date": "2026-09-01",
    due_time: "10:00",
    "Due time": "10:00",
    status: "in progress",
    Status: "in progress",
  },
  {
    task_title: "Fix login authentication bug",
    "Task title": "Fix login authentication bug",
    description: "Resolve token refresh failure on expired sessions.",
    Description: "Resolve token refresh failure on expired sessions.",
    department: "Engineering",
    Department: "Engineering",
    assigned_staff: "Tunde Bakare",
    "Assigned staff": "Tunde Bakare",
    priority: "high",
    Priority: "high",
    due_date: "2026-09-03",
    "Due date": "2026-09-03",
    due_time: "14:30",
    "Due time": "14:30",
    status: "pending",
    Status: "pending",
  },
  {
    task_title: "Quarterly budget review",
    "Task title": "Quarterly budget review",
    description: "Reconcile Q3 spend and prepare variance report for finance.",
    Description: "Reconcile Q3 spend and prepare variance report for finance.",
    department: "Finance",
    Department: "Finance",
    assigned_staff: "Chioma Eze",
    "Assigned staff": "Chioma Eze",
    priority: "medium",
    Priority: "medium",
    due_date: "2026-09-05",
    "Due date": "2026-09-05",
    due_time: "09:00",
    "Due time": "09:00",
    status: "completed",
    Status: "completed",
  },
  {
    task_title: "Onboard new marketing intern",
    "Task title": "Onboard new marketing intern",
    description: "Set up accounts, walk through tools, and assign first project.",
    Description: "Set up accounts, walk through tools, and assign first project.",
    department: "Marketing",
    Department: "Marketing",
    assigned_staff: "Amara Okafor",
    "Assigned staff": "Amara Okafor",
    priority: "low",
    Priority: "low",
    due_date: "2026-09-08",
    "Due date": "2026-09-08",
    due_time: "11:00",
    "Due time": "11:00",
    status: "pending",
    Status: "pending",
  },
  {
    task_title: "Migrate database to new cluster",
    "Task title": "Migrate database to new cluster",
    description: "Plan zero-downtime migration and run staging dry run.",
    Description: "Plan zero-downtime migration and run staging dry run.",
    department: "Engineering",
    Department: "Engineering",
    assigned_staff: "Tunde Bakare",
    "Assigned staff": "Tunde Bakare",
    priority: "high",
    Priority: "high",
    due_date: "2026-09-12",
    "Due date": "2026-09-12",
    due_time: "16:00",
    "Due time": "16:00",
    status: "in progress",
    Status: "in progress",
  },
  {
    task_title: "Draft social media calendar",
    "Task title": "Draft social media calendar",
    description: "Outline posts for October across all channels.",
    Description: "Outline posts for October across all channels.",
    department: "Marketing",
    Department: "Marketing",
    assigned_staff: "Ngozi Adeyemi",
    "Assigned staff": "Ngozi Adeyemi",
    priority: "medium",
    Priority: "medium",
    due_date: "2026-09-15",
    "Due date": "2026-09-15",
    due_time: "13:00",
    "Due time": "13:00",
    status: "in progress",
    Status: "in progress",
  },
  {
    task_title: "Audit vendor contracts",
    "Task title": "Audit vendor contracts",
    description: "Review renewal dates and flag auto-renew clauses.",
    Description: "Review renewal dates and flag auto-renew clauses.",
    department: "Legal",
    Department: "Legal",
    assigned_staff: "Chioma Eze",
    "Assigned staff": "Chioma Eze",
    priority: "low",
    Priority: "low",
    due_date: "2026-09-18",
    "Due date": "2026-09-18",
    due_time: "15:30",
    "Due time": "15:30",
    status: "pending",
    Status: "pending",
  },
  {
    task_title: "Ship mobile app v2.3",
    "Task title": "Ship mobile app v2.3",
    description: "Final QA pass, release notes, and store submission.",
    Description: "Final QA pass, release notes, and store submission.",
    department: "Engineering",
    Department: "Engineering",
    assigned_staff: "Amara Okafor",
    "Assigned staff": "Amara Okafor",
    priority: "high",
    Priority: "high",
    due_date: "2026-09-21",
    "Due date": "2026-09-21",
    due_time: "17:00",
    "Due time": "17:00",
    status: "pending",
    Status: "pending",
  },
  {
    task_title: "Update employee handbook",
    "Task title": "Update employee handbook",
    description: "Incorporate new remote-work and leave policies.",
    Description: "Incorporate new remote-work and leave policies.",
    department: "HR",
    Department: "HR",
    assigned_staff: "Ngozi Adeyemi",
    "Assigned staff": "Ngozi Adeyemi",
    priority: "medium",
    Priority: "medium",
    due_date: "2026-09-24",
    "Due date": "2026-09-24",
    due_time: "10:30",
    "Due time": "10:30",
    status: "completed",
    Status: "completed",
  },
  {
    task_title: "Prepare investor deck",
    "Task title": "Prepare investor deck",
    description: "Compile metrics, growth charts, and roadmap summary.",
    Description: "Compile metrics, growth charts, and roadmap summary.",
    department: "Finance",
    Department: "Finance",
    assigned_staff: "Chioma Eze",
    "Assigned staff": "Chioma Eze",
    priority: "high",
    Priority: "high",
    due_date: "2026-09-28",
    "Due date": "2026-09-28",
    due_time: "08:30",
    "Due time": "08:30",
    status: "in progress",
    Status: "in progress",
  },
  {
    task_title: "Refactor notification service",
    "Task title": "Refactor notification service",
    description: "Extract shared logic and add retry with backoff.",
    Description: "Extract shared logic and add retry with backoff.",
    department: "Engineering",
    Department: "Engineering",
    assigned_staff: "Tunde Bakare",
    "Assigned staff": "Tunde Bakare",
    priority: "low",
    Priority: "low",
    due_date: "2026-09-07",
    "Due date": "2026-09-07",
    due_time: "12:00",
    "Due time": "12:00",
    status: "completed",
    Status: "completed",
  },
  {
    task_title: "Launch referral program",
    "Task title": "Launch referral program",
    description: "Coordinate email blast, in-app banner, and tracking.",
    Description: "Coordinate email blast, in-app banner, and tracking.",
    department: "Marketing",
    Department: "Marketing",
    assigned_staff: "Amara Okafor",
    "Assigned staff": "Amara Okafor",
    priority: "medium",
    Priority: "medium",
    due_date: "2026-09-30",
    "Due date": "2026-09-30",
    due_time: "14:00",
    "Due time": "14:00",
    status: "pending",
    Status: "pending",
  },
]


/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

// Falls back to dummy data if the API fails or returns nothing. Set to false in prod.
const USE_DUMMY_FALLBACK = true

const PRIORITY = {
  high: {
    label: "High",
    rank: 3,
    dot: "bg-rose-500",
    accent: "border-l-rose-500",
    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/25",
  },
  medium: {
    label: "Medium",
    rank: 2,
    dot: "bg-amber-500",
    accent: "border-l-amber-500",
    pill: "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  },
  low: {
    label: "Low",
    rank: 1,
    dot: "bg-emerald-500",
    accent: "border-l-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  },
}
const PRIORITY_FALLBACK = {
  label: "None",
  rank: 0,
  dot: "bg-slate-400",
  accent: "border-l-slate-400",
  pill: "bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20",
  badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/25",
}
const priorityOf = (p) => PRIORITY[p] ?? PRIORITY_FALLBACK

const STATUS = {
  pending: {
    label: "Pending",
    icon: CircleDashed,
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  },
  "in progress": {
    label: "In progress",
    icon: Loader2,
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/25",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  },
}
const statusOf = (s) => STATUS[s] ?? { ...STATUS.pending, label: s || "Pending" }

const AVATAR_TONES = [
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MAX_PILLS = 3

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// The API / dummy data sometimes carries both snake_case and "Title case" keys.
// Normalise once so the rest of the UI only deals with one shape.
const normalizeTask = (t, i) => ({
  id: t.id ?? t._id ?? `task-${i}`,
  title: t.task_title ?? t["Task title"] ?? "Untitled task",
  description: t.description ?? t.Description ?? "",
  department: t.department ?? t.Department ?? "",
  staff: t.assigned_staff ?? t["Assigned staff"] ?? "",
  priority: String(t.priority ?? t.Priority ?? "").toLowerCase(),
  dueDate: String(t.due_date ?? t["Due date"] ?? "").slice(0, 10),
  dueTime: t.due_time ?? t["Due time"] ?? "",
  status: String(t.status ?? t.Status ?? "pending").toLowerCase().replace(/_/g, " "),
})

const toDate = (str) => (str ? parseISO(str) : null)

const formatTime = (hhmm) => {
  if (!hhmm) return ""
  const [h, m] = hhmm.split(":").map(Number)
  if (Number.isNaN(h)) return hhmm
  const d = new Date()
  d.setHours(h, m || 0, 0, 0)
  return format(d, "h:mm a")
}

const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("")

const toneFor = (name) => {
  let hash = 0
  for (const ch of name || "") hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

const isOverdue = (task, today) => {
  const due = toDate(task.dueDate)
  return !!due && task.status !== "completed" && differenceInCalendarDays(due, today) < 0
}

const relativeDue = (task, today) => {
  const due = toDate(task.dueDate)
  if (!due) return null
  if (task.status === "completed") return { text: "Completed", tone: "text-emerald-600 dark:text-emerald-400" }
  const diff = differenceInCalendarDays(due, today)
  if (diff === 0) return { text: "Due today", tone: "text-amber-600 dark:text-amber-400" }
  if (diff === 1) return { text: "Due tomorrow", tone: "text-muted-foreground" }
  if (diff > 1) return { text: `Due in ${diff} days`, tone: "text-muted-foreground" }
  const late = Math.abs(diff)
  return {
    text: `Overdue by ${late} day${late === 1 ? "" : "s"}`,
    tone: "text-rose-600 dark:text-rose-400",
  }
}

const matchesFilters = (t, f, q) =>
  (f.department === "all" || t.department === f.department) &&
  (f.priority === "all" || t.priority === f.priority) &&
  (f.status === "all" || t.status === f.status) &&
  (f.staff === "all" || t.staff === f.staff) &&
  (!q || `${t.title} ${t.description} ${t.staff} ${t.department}`.toLowerCase().includes(q))

const compareTasks = (a, b, key) => {
  switch (key) {
    case "priority":
      return priorityOf(a.priority).rank - priorityOf(b.priority).rank
    case "due":
      return `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)
    default:
      return String(a[key] ?? "").localeCompare(String(b[key] ?? ""))
  }
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

const Avatar = ({ name, size = "sm" }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
      size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-xs",
      toneFor(name)
    )}
  >
    {initials(name)}
  </span>
)

const StatusBadge = ({ status }) => {
  const s = statusOf(status)
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        s.badge
      )}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  )
}

const PriorityBadge = ({ priority }) => {
  const p = priorityOf(priority)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        p.badge
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
      {p.label}
    </span>
  )
}

const TaskPill = ({ task, selected, onClick }) => {
  const p = priorityOf(task.priority)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(task)
      }}
      title={`${task.title}${task.dueTime ? ` · ${formatTime(task.dueTime)}` : ""}`}
      className={cn(
        "flex w-full items-center gap-1.5 truncate rounded-md border-l-[3px] px-2 py-1 text-left text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        p.accent,
        p.pill,
        task.status === "completed" && "opacity-55 line-through",
        selected && "ring-2 ring-ring"
      )}
    >
      <span className="truncate">{task.title}</span>
    </button>
  )
}

const SegmentedControl = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-lg bg-muted p-1" role="tablist">
    {options.map(({ value: v, label, icon: Icon }) => (
      <button
        key={v}
        role="tab"
        aria-selected={value === v}
        onClick={() => onChange(v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === v
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    ))}
  </div>
)

const FilterSelect = ({ value, onChange, placeholder, allLabel, options, icon: Icon }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-9 bg-card">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder={placeholder} />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{allLabel}</SelectItem>
      {options.map((o) => (
        <SelectItem key={o} value={o} className="capitalize">
          {o}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

/* -------------------------------------------------------------------------- */
/*  Right side panel                                                          */
/* -------------------------------------------------------------------------- */

const InfoRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  </div>
)

const TaskDetail = ({ task, today, onClose, onComplete, onEdit, onDelete }) => {
  const rel = relativeDue(task, today)
  const due = toDate(task.dueDate)
  const overdue = isOverdue(task, today)

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)} aria-label="Edit task">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-rose-600"
              onClick={() => onDelete(task)}
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>

        <h2 className="mt-4 text-xl font-semibold leading-snug tracking-tight">{task.title}</h2>

        {rel && (
          <p className={cn("mt-1.5 flex items-center gap-1.5 text-sm font-medium", rel.tone)}>
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {rel.text}
          </p>
        )}

        <div className="mt-5 rounded-xl border bg-background/50 px-4">
          <div className="divide-y">
            <InfoRow icon={User} label="Assigned to">
              {task.staff ? (
                <span className="flex items-center gap-2">
                  <Avatar name={task.staff} />
                  {task.staff}
                </span>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </InfoRow>
            <InfoRow icon={Building2} label="Department">
              <span className="capitalize">{task.department || "—"}</span>
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Due date">
              {due ? format(due, "EEEE, d MMMM yyyy") : "—"}
            </InfoRow>
            <InfoRow icon={Clock} label="Due time">
              {task.dueTime ? formatTime(task.dueTime) : "—"}
            </InfoRow>
            <InfoRow icon={Flag} label="Priority">
              <span className="capitalize">{task.priority || "—"}</span>
            </InfoRow>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Description</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {task.description || "No description provided."}
          </p>
        </div>
      </div>

      {task.status !== "completed" && (
        <div className="border-t p-4">
          <Button className="w-full" onClick={() => onComplete(task.id)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as complete
          </Button>
        </div>
      )}
    </>
  )
}

const AgendaRow = ({ task, onSelect }) => {
  const p = priorityOf(task.priority)
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-l-[3px] bg-background/50 p-3 text-left transition-colors hover:bg-muted/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        p.accent
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", task.status === "completed" && "line-through opacity-60")}>
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[task.staff, task.dueTime && formatTime(task.dueTime)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", statusOf(task.status).dot)} title={statusOf(task.status).label} />
    </button>
  )
}

const AgendaPanel = ({ date, dayTasks, upcoming, overdueCount, onSelect, onClose }) => (
  <>
    <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {date ? format(date, "EEEE, d MMMM") : "Coming up"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {date
            ? `${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"} on this day`
            : "Select a task to see everything about it"}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 xl:hidden" onClick={onClose} aria-label="Close panel">
        <X className="h-4 w-4" />
      </Button>
    </div>

    <div className="flex-1 space-y-2 overflow-y-auto p-4">
      {!date && overdueCount > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {overdueCount} overdue task{overdueCount === 1 ? "" : "s"}
        </div>
      )}

      {(date ? dayTasks : upcoming).map((t) => (
        <AgendaRow key={t.id} task={t} onSelect={onSelect} />
      ))}

      {(date ? dayTasks : upcoming).length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
          {date ? <CalendarX2 className="h-8 w-8" /> : <MousePointerClick className="h-8 w-8" />}
          <p className="text-sm">
            {date ? "Nothing scheduled for this day." : "No upcoming tasks match your filters."}
          </p>
        </div>
      )}
    </div>
  </>
)

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export const RenderTask = ({ onEdit, onDelete }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("calendar")
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({ department: "all", priority: "all", status: "all", staff: "all" })
  const [sort, setSort] = useState({ key: "due", dir: "asc" })

  const today = useMemo(() => startOfDay(new Date()), [])

  /* ---------- Data ---------- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get("/task/get_task")
        const data = res.data?.length || !USE_DUMMY_FALLBACK ? res.data || [] : dummyTasks
        if (alive) setTasks(data.map(normalizeTask))
      } catch (err) {
        console.error("Error fetching tasks:", err)
        if (alive && USE_DUMMY_FALLBACK) setTasks(dummyTasks.map(normalizeTask))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelectedId(null)
        setSelectedDate(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  /* ---------- Derived data ---------- */
  const options = useMemo(() => {
    const uniq = (key) => [...new Set(tasks.map((t) => t[key]).filter(Boolean))].sort()
    return {
      department: uniq("department"),
      staff: uniq("staff"),
      priority: ["high", "medium", "low"].filter((p) => tasks.some((t) => t.priority === p)),
      status: ["pending", "in progress", "completed"].filter((s) => tasks.some((t) => t.status === s)),
    }
  }, [tasks])

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => tasks.filter((t) => matchesFilters(t, filters, q)), [tasks, filters, q])

  // Counts for the status tiles ignore the status filter itself, so they stay meaningful.
  const statusCounts = useMemo(() => {
    const base = tasks.filter((t) => matchesFilters(t, { ...filters, status: "all" }, q))
    return {
      all: base.length,
      pending: base.filter((t) => t.status === "pending").length,
      "in progress": base.filter((t) => t.status === "in progress").length,
      completed: base.filter((t) => t.status === "completed").length,
    }
  }, [tasks, filters, q])

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
      }),
    [cursor]
  )

  const tasksByDate = useMemo(() => {
    const map = {}
    filtered.forEach((t) => {
      if (!t.dueDate) return
      ;(map[t.dueDate] ||= []).push(t)
    })
    Object.values(map).forEach((list) => list.sort((a, b) => a.dueTime.localeCompare(b.dueTime)))
    return map
  }, [filtered])

  const sorted = useMemo(() => {
    const list = [...filtered].sort((a, b) => compareTasks(a, b, sort.key))
    return sort.dir === "asc" ? list : list.reverse()
  }, [filtered, sort])

  const upcoming = useMemo(
    () =>
      filtered
        .filter((t) => t.status !== "completed" && t.dueDate && !isOverdue(t, today))
        .sort((a, b) => compareTasks(a, b, "due"))
        .slice(0, 8),
    [filtered, today]
  )

  const overdueCount = useMemo(() => filtered.filter((t) => isOverdue(t, today)).length, [filtered, today])

  const selectedTask = tasks.find((t) => t.id === selectedId) || null
  const selectedDayKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const hasSelection = !!selectedTask || !!selectedDate

  /* ---------- Actions ---------- */
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const hasActiveFilters = Object.values(filters).some((v) => v !== "all") || !!q
  const clearFilters = () => {
    setFilters({ department: "all", priority: "all", status: "all", staff: "all" })
    setQuery("")
  }

  const selectTask = (task) => {
    setSelectedId(task.id)
    const d = toDate(task.dueDate)
    if (d) setSelectedDate(d)
  }

  const closePanel = () => {
    setSelectedId(null)
    setSelectedDate(null)
  }

  const markComplete = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)))
    // TODO: persist -> api.patch(`task/${id}`, { status: "completed" })
  }

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

  /* ---------- Render ---------- */
  const statTiles = [
    { key: "all", label: "All tasks", dot: "bg-foreground/40" },
    { key: "pending", label: "Pending", dot: STATUS.pending.dot },
    { key: "in progress", label: "In progress", dot: STATUS["in progress"].dot },
    { key: "completed", label: "Completed", dot: STATUS.completed.dot },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Who's doing what, and when it's due.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, staff…"
                className="h-9 w-full bg-card pl-9 sm:w-64"
              />
            </div>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: "calendar", label: "Calendar", icon: CalendarDays },
                { value: "table", label: "List", icon: LayoutList },
              ]}
            />
          </div>
        </header>

        {/* ---------------- Status tiles ---------------- */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statTiles.map(({ key, label, dot }) => {
            const active = filters.status === key
            return (
              <button
                key={key}
                onClick={() => setFilter("status")(active ? "all" : key)}
                className={cn(
                  "rounded-xl border bg-card px-4 py-3 text-left transition-all",
                  "hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  (active || (key === "all" && filters.status === "all")) && "border-foreground/30 shadow-sm"
                )}
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", dot)} />
                  {label}
                </span>
                <span className="mt-1 block text-2xl font-semibold tabular-nums">{statusCounts[key]}</span>
              </button>
            )
          })}
        </div>

        {/* ---------------- Filters ---------------- */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <FilterSelect
            icon={User}
            value={filters.staff}
            onChange={setFilter("staff")}
            placeholder="Staff"
            allLabel="All staff"
            options={options.staff}
          />
          <FilterSelect
            icon={Building2}
            value={filters.department}
            onChange={setFilter("department")}
            placeholder="Department"
            allLabel="All departments"
            options={options.department}
          />
          <FilterSelect
            icon={Flag}
            value={filters.priority}
            onChange={setFilter("priority")}
            placeholder="Priority"
            allLabel="All priorities"
            options={options.priority}
          />
          <FilterSelect
            icon={CircleDashed}
            value={filters.status}
            onChange={setFilter("status")}
            placeholder="Status"
            allLabel="All statuses"
            options={options.status}
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 justify-start text-rose-600 hover:text-rose-600 dark:text-rose-400">
              <FilterX className="mr-1.5 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        {/* ---------------- Body: content + docked right panel ---------------- */}
        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* ===== Main view ===== */}
          <main className="min-w-0">
            {loading ? (
              <div className="h-[560px] animate-pulse rounded-2xl border bg-card" />
            ) : view === "calendar" ? (
              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {/* Month controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <h2 className="min-w-[9.5rem] text-lg font-semibold tracking-tight">
                      {format(cursor, "MMMM yyyy")}
                    </h2>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCursor(new Date())}>
                      Today
                    </Button>
                  </div>

                  <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                    {["high", "medium", "low"].map((k) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", PRIORITY[k].dot)} />
                        {PRIORITY[k].label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 border-b bg-muted/40">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, idx) => {
                    const key = format(day, "yyyy-MM-dd")
                    const dayTasks = tasksByDate[key] || []
                    const inMonth = isSameMonth(day, cursor)
                    const isToday = isSameDay(day, today)
                    const isSelectedDay = selectedDate && isSameDay(day, selectedDate)
                    const extra = dayTasks.length - MAX_PILLS

                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedDate(day)
                          setSelectedId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedDate(day)
                            setSelectedId(null)
                          }
                        }}
                        className={cn(
                          "group relative flex min-h-[68px] cursor-pointer flex-col gap-1 border-b p-1.5 text-left transition-colors sm:min-h-[116px]",
                          idx % 7 !== 6 && "border-r",
                          !inMonth && "bg-muted/30",
                          "hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          isSelectedDay && "bg-primary/5 ring-2 ring-inset ring-primary/40"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : inMonth
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {/* Desktop: pills */}
                        <div className="hidden flex-col gap-1 sm:flex">
                          {dayTasks.slice(0, MAX_PILLS).map((t) => (
                            <TaskPill key={t.id} task={t} selected={t.id === selectedId} onClick={selectTask} />
                          ))}
                          {extra > 0 && (
                            <span className="pl-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                              +{extra} more
                            </span>
                          )}
                        </div>

                        {/* Mobile: dots */}
                        <div className="flex flex-wrap gap-1 px-0.5 sm:hidden">
                          {dayTasks.slice(0, 4).map((t) => (
                            <span key={t.id} className={cn("h-1.5 w-1.5 rounded-full", priorityOf(t.priority).dot)} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        {[
                          ["title", "Task"],
                          ["department", "Department"],
                          ["staff", "Assigned to"],
                          ["priority", "Priority"],
                          ["due", "Due"],
                          ["status", "Status"],
                        ].map(([key, label]) => (
                          <th key={key} className="px-4 py-3 font-medium">
                            <button
                              onClick={() => toggleSort(key)}
                              className="inline-flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {label}
                              {sort.key === key ? (
                                sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sorted.map((t) => {
                        const overdue = isOverdue(t, today)
                        return (
                          <tr
                            key={t.id}
                            onClick={() => selectTask(t)}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-muted/50",
                              t.id === selectedId && "bg-primary/5"
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className={cn("h-8 w-1 shrink-0 rounded-full", priorityOf(t.priority).dot)} />
                                <span className={cn("font-medium", t.status === "completed" && "line-through opacity-60")}>
                                  {t.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize text-muted-foreground">{t.department || "—"}</td>
                            <td className="px-4 py-3">
                              {t.staff ? (
                                <span className="flex items-center gap-2">
                                  <Avatar name={t.staff} />
                                  <span className="whitespace-nowrap">{t.staff}</span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <PriorityBadge priority={t.priority} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className={cn(overdue && "font-medium text-rose-600 dark:text-rose-400")}>
                                {t.dueDate ? format(parseISO(t.dueDate), "d MMM yyyy") : "—"}
                              </span>
                              {t.dueTime && (
                                <span className="ml-1.5 text-xs text-muted-foreground">{formatTime(t.dueTime)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {sorted.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-20 text-center text-muted-foreground">
                    <CalendarX2 className="h-8 w-8" />
                    <p className="text-sm">No tasks match your filters.</p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </section>
            )}
          </main>

          {/* ===== Docked right panel (bottom sheet on small screens) ===== */}
          {hasSelection && (
            <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] xl:hidden" onClick={closePanel} />
          )}
          <aside
            className={cn(
              "z-40 flex-col overflow-hidden border bg-card shadow-2xl",
              "fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl",
              "xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:max-h-none xl:rounded-2xl xl:shadow-sm",
              hasSelection ? "flex" : "hidden xl:flex"
            )}
          >
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                today={today}
                onClose={closePanel}
                onComplete={markComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : (
              <AgendaPanel
                date={selectedDate}
                dayTasks={selectedDayKey ? tasksByDate[selectedDayKey] || [] : []}
                upcoming={upcoming}
                overdueCount={overdueCount}
                onSelect={selectTask}
                onClose={closePanel}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

