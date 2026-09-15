"use client"

import React, { useState, useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
// Note: Ensure lucide-react is installed or swap with your matching icon set
import { LayoutGrid, TableProperties, FilterX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import api from "@/lib/api.js"
"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  LayoutGrid,
  TableProperties,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function TaskManagement() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="qr" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="qr">
            Create Task
          </TabsTrigger>

          <TabsTrigger value="attendance">
            View Task
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr">
          <CreateTaskForm />
        </TabsContent>

        <TabsContent value="attendance">
          <RenderTask />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const formSchema = z.object({
  task_title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  assigned_staff: z.string().min(1, { message: "Please assign a staff member." }),
  department: z.string().min(1, { message: "Please select a department." }),
  priority: z.string().min(1, { message: "Please select a priority level." }),
  due_date: z.string().min(1, { message: "Please select a due date." }),
  due_time: z.string().min(1, { message: "Please select a due time." }),
  status: z.string().min(1, { message: "Please select a status." }),
})

export function CreateTaskForm() {
  // 2. Initialize the form without TypeScript type generics
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_title: "",
      description: "",
      assigned_staff: "",
      department: "",
      priority: "",
      due_date: "",
      due_time: "",
      status: "pending", 
    },
  })

  // 3. Handle Submit with FormData and API call
  async function onSubmit(values) {
    try {
      const payload = new FormData()
      payload.append("task_title", values.task_title)
      payload.append("description", values.description) 
      payload.append("assigned_staff", values.assigned_staff)
      payload.append("department", values.department)
      payload.append("priority", values.priority)
      payload.append("due_date", values.due_date)
      payload.append("due_time", values.due_time)
      payload.append("status", values.status)

      // Assuming your api client instance is configured elsewhere
      const response = await api.post("/task/create_task", payload)
      console.log("Form successfully submitted to API")
    } catch (error) {
      console.error("Submission failed:", error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-6 border rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Create New Task</h2>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assigned Staff */}
          <FormField
            control={form.control}
            name="assigned_staff"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Staff</FormLabel>
                <FormControl>
                  <Input placeholder="Staff name or ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Department Dropdown */}
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Create Task</Button>
      </form>
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


/* ---------- Priority → color mapping (mirrors the inspo legend) ---------- */
const PRIORITY_STYLES = {
  high:    { bg: "bg-rose-100",   border: "border-rose-400",   text: "text-rose-700",   dot: "bg-rose-500" },
  medium:  { bg: "bg-amber-100",  border: "border-amber-400",  text: "text-amber-700",  dot: "bg-amber-500" },
  low:     { bg: "bg-emerald-100",border: "border-emerald-400",text: "text-emerald-700",dot: "bg-emerald-500" },
  default: { bg: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-700",   dot: "bg-blue-500" },
}

const getPriorityStyle = (priority) =>
  PRIORITY_STYLES[(priority || "").toLowerCase()] || PRIORITY_STYLES.default

export const RenderTask = () => {
  const [taskData, setTaskData] = useState([])
  const [viewType, setViewType] = useState("calendar")
  const [cursorDate, setCursorDate] = useState(new Date(2026, 8, 15)) // Sept 2026
  const [selectedTask, setSelectedTask] = useState(null)

  // Filter states
  const [filterDept, setFilterDept] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")

  /* ---------- Data fetch (kept as-is) ---------- */
  const get_data = async () => {
    try {
      const response = await api.get("task/get_task")
      setTaskData(response.data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }
  useEffect(() => { get_data() }, [])

  /* ---------- Unique filter options ---------- */
  const uniqueFilterOptions = useMemo(() => {
    const staff = new Set(), departments = new Set(), priorities = new Set(), statuses = new Set()
    taskData.forEach((t) => {
      if (t.assigned_staff) staff.add(t.assigned_staff)
      if (t.department) departments.add(t.department)
      if (t.priority) priorities.add(t.priority)
      if (t.status) statuses.add(t.status)
    })
    return {
      staff: [...staff],
      departments: [...departments],
      priorities: [...priorities],
      statuses: [...statuses],
    }
  }, [taskData])

  /* ---------- Filtered tasks ---------- */
  const filteredTasks = useMemo(() => {
    return taskData.filter((t) => {
      return (
        (filterDept === "all" || t.department === filterDept) &&
        (filterPriority === "all" || t.priority === filterPriority) &&
        (filterStatus === "all" || t.status === filterStatus) &&
        (filterStaff === "all" || t.assigned_staff === filterStaff)
      )
    })
  }, [taskData, filterDept, filterPriority, filterStatus, filterStaff])

  /* ---------- Build calendar grid with date-fns ---------- */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(cursorDate)
    const monthEnd = endOfMonth(cursorDate)
    // Week starts on Sunday to match the inspo
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursorDate])

  /* ---------- Group tasks by date once (O(n)) ---------- */
  const tasksByDate = useMemo(() => {
    const map = {}
    filteredTasks.forEach((t) => {
      const raw = t.due_date || t["Due date"]
      if (!raw) return
      const key = typeof raw === "string" ? raw.slice(0, 10) : format(raw, "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filteredTasks])

  const clearFilters = () => {
    setFilterDept("all"); setFilterPriority("all")
    setFilterStatus("all"); setFilterStaff("all")
  }

  const hasActiveFilters =
    filterDept !== "all" || filterPriority !== "all" ||
    filterStatus !== "all" || filterStaff !== "all"

  const today = new Date()

  /* ---------- Reusable task pill ---------- */
  const TaskPill = ({ task, onClick }) => {
    const style = getPriorityStyle(task.priority || task.Priority)
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(task) }}
        title={`${task.task_title || task["Task title"]} • ${task.due_time || ""}`}
        className={`w-full text-left text-[11px] px-2 py-1 rounded-md border-l-2 ${style.border} ${style.bg} ${style.text} font-medium truncate hover:brightness-95 transition`}
      >
        {task.task_title || task["Task title"]}
      </button>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ===================== SIDEBAR (inspo-style) ===================== */}
      <aside className="hidden lg:flex w-56 flex-col bg-[#1e2a4a] text-slate-200 p-5 gap-1">
        <h1 className="text-white text-lg font-semibold mb-6">Roomchecking</h1>
        {["Task", "Recurrences", "Statistics", "Rules", "Contracts", "Assets"].map((item) => (
          <div
            key={item}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer ${
              item === "Task"
                ? "bg-white/10 text-white font-medium border-l-2 border-orange-400"
                : "hover:bg-white/5"
            }`}
          >
            <div className="h-4 w-4 rounded-sm bg-slate-400/30" />
            {item}
          </div>
        ))}
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex-1 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Maintenances</h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search here" className="pl-9 w-64 bg-white" />
            </div>
            <div className="flex items-center bg-white border rounded-lg p-1">
              <Button
                variant={viewType === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewType("table")}
              >
                <TableProperties className="h-4 w-4 mr-1.5" /> Table
              </Button>
              <Button
                variant={viewType === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewType("calendar")}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" /> Calendar
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 border rounded-xl">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {uniqueFilterOptions.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {uniqueFilterOptions.priorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueFilterOptions.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger><SelectValue placeholder="Assigned Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {uniqueFilterOptions.staff.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-xs text-rose-600 justify-start gap-1 col-span-full md:col-span-1"
            >
              <FilterX className="h-3.5 w-3.5" /> Clear Active Filters
            </Button>
          )}
        </div>

        {/* ===================== CALENDAR ===================== */}
        {viewType === "calendar" && (
          <div className="bg-white border rounded-xl overflow-hidden">
            {/* Month header with arrows */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setCursorDate(subMonths(cursorDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[140px] text-center text-sm font-semibold text-slate-800">
                  {format(cursorDate, "d MMMM yyyy")}
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8"
                  onClick={() => setCursorDate(addMonths(cursorDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs ml-2"
                  onClick={() => setCursorDate(new Date())}>
                  Today
                </Button>
              </div>

              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
                {Object.entries(PRIORITY_STYLES).filter(([k]) => k !== "default").map(([key, s]) => (
                  <div key={key} className="flex items-center gap-1.5 capitalize">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    {key}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekday row */}
            <div className="grid grid-cols-7 border-b bg-slate-50">
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold tracking-wide uppercase text-slate-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const dayTasks = tasksByDate[key] || []
                const inMonth = isSameMonth(day, cursorDate)
                const isToday = isSameDay(day, today)

                return (
                  <div
                    key={key}
                    className={`min-h-[110px] border-r border-b p-1.5 flex flex-col gap-1 ${
                      inMonth ? "bg-white" : "bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        isToday
                          ? "bg-orange-500 text-white rounded-full h-5 w-5 flex items-center justify-center"
                          : inMonth ? "text-slate-700" : "text-slate-400"
                      }`}>
                        {format(day, "d")}
                      </span>
                      {dayTasks.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{dayTasks.length - 2}</span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 2).map((task, i) => (
                        <TaskPill key={i} task={task} onClick={setSelectedTask} />
                      ))}
                      {dayTasks.length > 2 && (
                        <button
                          onClick={() => setSelectedTask(dayTasks[0])}
                          className="text-[10px] text-primary hover:underline pl-1"
                        >
                          + {dayTasks.length - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===================== TABLE (unchanged, just kept) ===================== */}
        {viewType === "table" && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="p-3">Task</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Assigned</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Due</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTasks.map((t, i) => {
                    const s = getPriorityStyle(t.priority || t.Priority)
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">{t.task_title || t["Task title"]}</td>
                        <td className="p-3 capitalize">{t.department || "—"}</td>
                        <td className="p-3 text-xs font-mono">{t.assigned_staff || "—"}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                            {t.priority || "—"}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {t.due_date} @ {t.due_time}
                        </td>
                        <td className="p-3 capitalize">{t.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== SIDE DETAIL PANEL ===================== */}
        {selectedTask && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelectedTask(null)}
            />
            <div className="fixed right-4 top-20 z-50 w-80 bg-white rounded-xl shadow-2xl border p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  <Pencil className="h-3.5 w-3.5 cursor-pointer hover:text-slate-600" />
                  <Trash2 className="h-3.5 w-3.5 cursor-pointer hover:text-rose-500" />
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="h-6 w-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center hover:bg-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 leading-snug">
                {selectedTask.task_title || selectedTask["Task title"]}
              </h3>

              {/* Priority strip */}
              <div>
                <p className="text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Priority</p>
                <div className="flex items-center gap-2">
                  {Object.entries(PRIORITY_STYLES).filter(([k]) => k !== "default").map(([key, s]) => (
                    <span
                      key={key}
                      className={`h-6 w-6 rounded-full ${s.dot} ${
                        (selectedTask.priority || "").toLowerCase() === key
                          ? "ring-2 ring-offset-2 ring-slate-400"
                          : "opacity-40"
                      }`}
                      title={key}
                    />
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="text-sm space-y-2 pt-2 border-t">
                {[
                  ["Department", selectedTask.department || "—"],
                  ["Assigned To", selectedTask.assigned_staff || "—"],
                  ["Status", selectedTask.status || "—"],
                  ["Due Date", selectedTask.due_date || "—"],
                  ["Due Time", selectedTask.due_time || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-slate-400 text-xs">{label}</span>
                    <span className="text-slate-700 text-xs font-medium text-right capitalize">{value}</span>
                  </div>
                ))}
              </div>

              {selectedTask.description && (
                <div className="pt-2 border-t">
                  <p className="text-[11px] uppercase text-slate-400 font-semibold mb-1">Description</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  Cancel Task
                </Button>
                <Button size="sm" className="flex-1 text-xs bg-orange-500 hover:bg-orange-600">
                  Move to Departure
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}