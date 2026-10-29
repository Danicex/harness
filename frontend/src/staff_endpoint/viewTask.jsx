import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Layers, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import axios from 'axios';
const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL
axios.defaults.baseURL = API_ENDPOINT;

const ViewTask = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const getTasks = async () => {
  setLoading(true);
  setError(false);
  
  try {
    // Replace with your actual base URL or environment variable if not already set globally
    const response = await axios.get('/task/get_staff_task',{
      headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
  }
      });
    setTasks(Array.isArray(response.data) ? response.data : []);
    console.log(response.data)
  } catch (err) {
    setError(true);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    getTasks();
  }, []);

  // Helper: Visual Badge variants mapping for Status configurations
  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
      completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    };
    const cleanStatus = status?.toLowerCase() || 'pending';
    return variants[cleanStatus] || "bg-slate-100 text-slate-800";
  };

  // Helper: Visual Badge variants mapping for Task Urgency Priorities
  const getPriorityBadge = (priority) => {
    const variants = {
      high: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400",
      medium: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400",
      low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    };
    const cleanPriority = priority?.toLowerCase() || 'medium';
    return variants[cleanPriority] || "bg-slate-100 text-slate-800";
  };

  // 1. Loading State UI
  if (loading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading assigned tasks...</p>
      </div>
    );
  }

  // 2. Error State UI
  if (error) {
    return (
      <div className="mx-auto my-8 max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold text-destructive">Failed to load tasks</h3>
        <p className="mt-2 text-sm text-muted-foreground">Could not fetch dashboard operational tracking metrics.</p>
        <Button onClick={getTasks} variant="outline" className="mt-4">Retry Now</Button>
      </div>
    );
  }

  // 3. Empty State UI
  if (tasks.length === 0) {
    return (
      <div className="my-12 text-center border-2 border-dashed rounded-xl p-8 max-w-sm mx-auto">
        <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
        <p className="mt-4 text-muted-foreground font-medium">Clear backlog! No tasks found.</p>
      </div>
    );
  }

  // Parse dictionary keys/values safely for display rosters
  const getStaffList = (assignedStaff) => {
    if (!assignedStaff) return [];
    if (Array.isArray(assignedStaff)) return assignedStaff;
    return Object.entries(assignedStaff).map(([key, val]) => ({ id: key, name: String(val) }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Task Overview</h1>
        <p className="text-muted-foreground">Track structural department milestones and resource assignments.</p>
      </header>

      {/* Responsive Core Layout Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md border border-border">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]">
                  <Layers className="h-3 w-3" />
                  {task.department}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(task.status)}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <CardTitle className="line-clamp-1 text-lg font-bold">
                {task.task_title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pb-4">
              <p className="line-clamp-3 text-sm text-muted-foreground mb-4 min-h-[60px]">
                {task.description || "No description provided for this structural operation requirement."}
              </p>
              
              <div className="space-y-2 pt-2 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-foreground/70" />
                  <span>Due Date: <strong className="text-foreground/90">{task.due_date}</strong></span>
                </div>
                {task.due_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-foreground/70" />
                    <span>Time limit: <strong className="text-foreground/90">{task.due_time}</strong></span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t bg-muted/20 px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{getStaffList(task.assigned_staff).length} Assigned</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTask(task)}
                className="gap-1.5 text-primary hover:text-primary/90 p-0 font-medium"
              >
                View Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Details Dialog Modal Overlay */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        {selectedTask && (
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">{selectedTask.department}</Badge>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadge(selectedTask.priority)}`}>
                  {selectedTask.priority} Priority
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(selectedTask.status)}`}>
                  {selectedTask.status?.replace('_', ' ')}
                </span>
              </div>
              <DialogTitle className="text-2xl font-bold leading-tight">{selectedTask.task_title}</DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Task Reference ID: #{selectedTask.id} • Created relative to system time matrix
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Task Objective Description</h4>
                <p className="text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/50 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description || "No execution directives provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y py-3 my-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block font-medium">Execution Deadline</span>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Calendar className="h-4 w-4 text-primary" />
                    {selectedTask.due_date}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Cutoff Time Constraint</span>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    {selectedTask.due_time || "End of day"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Assigned Personnel Roster
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getStaffList(selectedTask.assigned_staff).length > 0 ? (
                    getStaffList(selectedTask.assigned_staff).map((staff, idx) => (
                      <Badge key={staff.id || idx} variant="outline" className="bg-background px-2.5 py-1 text-xs">
                        {staff.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No specific personnel flags locked within JSONB target map object.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setSelectedTask(null)}>
                Close Overlay
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default ViewTask;