import { useMemo, useState, useEffect } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search, Trash2, UserPlus, X, Loader2, Pencil, LayoutList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createTask, fetchTasks, fetchUsers, updateTaskStatus, updateTask, deleteTask } from "@/features/dashboard/api";
import { useAuthStore } from "@/store/auth-store";

import { CollectionPage } from "./CollectionPage";
import type { DirectoryUser } from "./people-utils";

type TaskItem = {
  title: string;
  description: string;
};

type TaskFormState = {
  tasks: TaskItem[];
  priority: string;
  givenDate: string;
  deadline: string;
  daysFrom: string;
};

export function MyTasksPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const users = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    tasks: [{ title: "", description: "" }],
    priority: "MEDIUM",
    givenDate: "",
    deadline: "",
    daysFrom: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const updateTaskMutation = useMutation({
    mutationFn: (task: any) => updateTask(task.id, {
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
      start_date: task.start_date,
      estimated_hours: task.estimated_hours,
      assigned_to_id: task.assigned_to_id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
  const directoryUsers = (users.data?.items ?? []) as DirectoryUser[];
  const userMap = useMemo(
    () =>
      new Map(
        directoryUsers.map((person) => [
          person.id,
          {
            full_name: person.full_name,
            role: person.role,
            department: person.profile?.department ?? person.job_title ?? "No department",
            profile_photo_url: person.avatar_url ?? undefined
          },
        ]),
      ),
    [directoryUsers],
  );
  const filteredPeople = directoryUsers.filter((person) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [person.full_name, person.role, person.profile?.department, person.job_title]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const filteredTasks = ((tasks.data?.items ?? []) as any[]).filter((task) => {
    if (!selectedAssigneeId) {
      return true;
    }
    return task.assigned_to_id === selectedAssigneeId;
  });

  const groupedTasks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || 0).getTime();
      const dateB = new Date(b.start_date || b.created_at || 0).getTime();
      
      const now = new Date().setHours(0,0,0,0);
      const isTodayA = new Date(a.start_date || a.created_at || 0).setHours(0,0,0,0) === now;
      const isTodayB = new Date(b.start_date || b.created_at || 0).setHours(0,0,0,0) === now;

      // Priority 1: Today
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // Priority 2: Future vs Past (Future should be above past if we are looking at assignments)
      // But usually, ascending order for everything after today is what user wants (Today -> Tomorrow)
      return dateA - dateB;
    });

    sortedTasks.forEach((task) => {
      const dateStr = task.start_date || task.created_at;
      const date = dateStr ? new Date(dateStr) : null;
      let dateKey = "No Date";
      
      if (date) {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
          dateKey = `Today's Assignments (${date.toLocaleDateString("en-IN")})`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
          dateKey = `Tomorrow's Assignments (${date.toLocaleDateString("en-IN")})`;
        } else {
          dateKey = date.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });
    return groups;
  }, [filteredTasks]);
  const selectedPerson = directoryUsers.find((person) => person.id === selectedAssigneeId) ?? null;
  const isFormValid = !!(
    selectedAssigneeId &&
    taskForm.tasks.every(t => t.title.trim()) &&
    taskForm.givenDate &&
    taskForm.deadline &&
    taskForm.daysFrom
  );
  const assignTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("Admin session not found. Please log in again.");
      }
      if (!selectedAssigneeId) {
        throw new Error("Select a team member first.");
      }

      const promises = taskForm.tasks.map(task => {
        const payload = {
          title: task.title.trim(),
          description: task.description.trim() || undefined,
          assigned_to_id: selectedAssigneeId,
          created_by_id: user.id,
          priority: taskForm.priority,
          status: "IN_PROGRESS",
          tags: [],
          start_date: taskForm.givenDate ? new Date(taskForm.givenDate).toISOString() : undefined,
          due_date: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : undefined,
          estimated_hours: taskForm.daysFrom ? parseInt(taskForm.daysFrom, 10) * 24 : undefined,
        };
        console.log("Sending Task Payload:", payload);
        return createTask(payload);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTaskForm({ tasks: [{ title: "", description: "" }], priority: "MEDIUM", givenDate: "", deadline: "", daysFrom: "" });
      setFormError(null);
      setShowAssignPanel(false);
    },
    onError: (error: any) => {
      console.error("Task Assignment Failed:", error);
      const detail = error?.response?.data?.detail;
      setFormError(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail || error?.message || "Unable to assign task right now.");
    },
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    // Clear task notifications when viewing tasks
    import("@/features/dashboard/api").then(api => {
      api.markNotificationsAsReadByType("TASK_ASSIGNED");
      api.markNotificationsAsReadByType("TASK_UPDATED");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [queryClient]);

  return (
    <div className="relative">
      <CollectionPage
      title="Tasks"
      subtitle="Assignment, priority, due dates, and delivery states"
      headerContent={
        isAdmin ? (
          <>
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  const val = event.target.value;
                  setSearchQuery(val);
                  setShowSearchDropdown(val.trim().length > 0);
                }}
                onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder="Search people by name or designation"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-400 focus:bg-white"
              />
              {/* Search Dropdown */}
              {showSearchDropdown && filteredPeople.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onMouseDown={() => {
                        setSelectedAssigneeId(person.id);
                        setSearchQuery(person.full_name);
                        setShowSearchDropdown(false);
                        setShowAssignPanel(true);
                        setFormError(null);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      {/* Mini Portrait */}
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                        {person.avatar_url ? (
                          <img src={person.avatar_url} alt={person.full_name} className="h-full w-full object-cover" />
                        ) : (
                          person.full_name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{person.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{person.profile?.department ?? person.job_title ?? "No department"}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 flex-shrink-0">
                        {person.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="gap-2 px-5 py-3"
              onClick={() => {
                setShowAssignPanel((current) => !current);
                setFormError(null);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Assign Tasks
            </Button>
          </>
        ) : (
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your tasks..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-400 focus:bg-white"
            />
          </div>
        )
      }
      contentBeforeItems={
        <>
          {isAdmin && showAssignPanel ? (
            <div className="mb-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
              {/* ... existing assign panel content ... */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Select A Team Member</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Search and select team members from the directory to assign them tasks directly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssignPanel(false)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {filteredPeople.length ? (
                      filteredPeople.map((person) => {
                        const isSelected = person.id === selectedAssigneeId;
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssigneeId(person.id);
                              setFormError(null);
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                              isSelected
                                ? "border-primary-500 bg-primary-50"
                                : "border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/40"
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-900">{person.full_name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {person.profile?.department ?? person.job_title ?? "No department"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {person.role}
                              </span>
                              {isSelected ? <Check className="h-4 w-4 text-primary-600" /> : null}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                        No team members found matching your search.
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <LayoutList className="text-primary-500" size={20} />
                      Task Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, tasks: [...taskForm.tasks, { title: "", description: "" }] })}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600 shadow-sm transition hover:bg-primary-100 hover:scale-110 active:scale-95"
                      title="Add Another Task"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {taskForm.tasks.map((taskItem, index) => (
                      <div key={index} className="relative space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">
                            Task {index + 1}
                          </span>
                          {taskForm.tasks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newTasks = [...taskForm.tasks];
                                newTasks.splice(index, 1);
                                setTaskForm({ ...taskForm, tasks: newTasks });
                              }}
                              className="rounded-full p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-bold uppercase text-slate-400">Task Name</label>
                            <input
                              type="text"
                              value={taskItem.title}
                              onChange={(e) => {
                                const newTasks = [...taskForm.tasks];
                                newTasks[index].title = e.target.value;
                                setTaskForm({ ...taskForm, tasks: newTasks });
                              }}
                              placeholder="e.g. API Integration"
                              className="mt-1 w-full rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-sm font-semibold text-slate-900 focus:border-primary-400 focus:bg-white focus:ring-0"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold uppercase text-slate-400">Description</label>
                            <textarea
                              value={taskItem.description}
                              onChange={(e) => {
                                const newTasks = [...taskForm.tasks];
                                newTasks[index].description = e.target.value;
                                setTaskForm({ ...taskForm, tasks: newTasks });
                              }}
                              placeholder="Describe the work..."
                              className="mt-1 min-h-[80px] w-full resize-none rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-sm text-slate-600 focus:border-primary-400 focus:bg-white focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Given Date</label>
                        <input
                          type="date"
                          value={taskForm.givenDate}
                          onChange={(e) => setTaskForm({ ...taskForm, givenDate: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Deadline</label>
                        <input
                          type="date"
                          value={taskForm.deadline}
                          onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Duration (Days)</label>
                        <input
                          type="number"
                          value={taskForm.daysFrom}
                          onChange={(e) => setTaskForm({ ...taskForm, daysFrom: e.target.value })}
                          placeholder="e.g. 5"
                          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
                        />
                      </div>
                    </div>

                    {formError ? (
                      <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                        {formError}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className={`px-5 py-3 transition-all duration-300 ${
                          isFormValid 
                            ? "bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 scale-105" 
                            : "bg-slate-300 cursor-not-allowed"
                        }`}
                        disabled={assignTaskMutation.isPending || !isFormValid}
                        onClick={() => assignTaskMutation.mutate()}
                      >
                        {assignTaskMutation.isPending ? "Assigning..." : "Assign Task"}
                      </Button>
                      <Button
                        type="button"
                        className="bg-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-300"
                        onClick={() => {
                          setSelectedAssigneeId(null);
                          setTaskForm({ tasks: [{ title: "", description: "" }], priority: "MEDIUM", givenDate: "", deadline: "", daysFrom: "" });
                          setFormError(null);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-8">
            {/* Selected Person's Existing Tasks */}
            {selectedAssigneeId && (() => {
              const personTasks = (tasks.data?.items ?? [] as any[]).filter((t: any) => t.assigned_to_id === selectedAssigneeId);
              const personName = directoryUsers.find(p => p.id === selectedAssigneeId)?.full_name || "Employee";
              return (
                <div className="rounded-[20px] border border-primary-100 bg-primary-50/30 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                      {(() => {
                        const p = directoryUsers.find(u => u.id === selectedAssigneeId);
                        return p?.avatar_url
                          ? <img src={p.avatar_url} alt={personName} className="h-full w-full object-cover" />
                          : personName.charAt(0);
                      })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{personName}'s Current Tasks</h4>
                      <p className="text-xs text-slate-500">{personTasks.length} task{personTasks.length !== 1 ? 's' : ''} assigned</p>
                    </div>
                  </div>
                  {personTasks.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {personTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          assignee={userMap.get(task.assigned_to_id ?? "")}
                          isAdmin={isAdmin}
                          onEdit={(t) => setEditingTask(t)}
                          onDelete={(id) => {
                            if (confirm("Are you sure you want to delete this task?")) {
                              deleteTaskMutation.mutate(id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No tasks assigned to {personName} yet.</p>
                  )}
                </div>
              );
            })()}

            {/* All Tasks Grouped by Date */}
            {Object.keys(groupedTasks).length > 0 && !selectedAssigneeId ? (
              Object.entries(groupedTasks).map(([dateLabel, tasksInGroup]) => (
                <div key={dateLabel} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-slate-400">
                      {dateLabel}
                    </h3>
                    <div className="h-px w-full bg-slate-200" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {tasksInGroup.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignee={userMap.get(task.assigned_to_id ?? "")}
                        isAdmin={isAdmin}
                        onEdit={(t) => setEditingTask(t)}
                        onDelete={(id) => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            deleteTaskMutation.mutate(id);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : !selectedAssigneeId ? (
              <div className="py-20 text-center">
                <p className="text-lg font-medium text-slate-400">No tasks found. Try assigning one above!</p>
              </div>
            ) : null}
          </div>
        </>
      }
      items={[]}
      render={() => null}
    />

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Task</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="mt-1 min-h-[100px] w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Assign To</label>
                  <select
                    value={editingTask.assigned_to_id || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, assigned_to_id: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {directoryUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.profile?.department || u.job_title || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Duration (Days)</label>
                  <input
                    type="number"
                    value={editingTask.estimated_hours ? Math.round(editingTask.estimated_hours / 24) : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, estimated_hours: parseInt(e.target.value, 10) * 24 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Given Date</label>
                  <input
                    type="date"
                    value={editingTask.start_date ? new Date(editingTask.start_date).toISOString().split('T')[0] : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Deadline</label>
                  <input
                    type="date"
                    value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button
                  className="flex-1 bg-primary-600 py-3 text-white hover:bg-primary-700 disabled:opacity-50"
                  disabled={updateTaskMutation.isPending}
                  onClick={() => updateTaskMutation.mutate(editingTask)}
                >
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  className="flex-1 bg-slate-100 py-3 text-slate-600 hover:bg-slate-200"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  assignee,
  isAdmin,
  onEdit,
  onDelete,
}: {
  task: any;
  assignee?: { full_name: string; role: string; department: string; profile_photo_url?: string };
  isAdmin: boolean;
  onEdit: (task: any) => void;
  onDelete: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateTaskStatus(task.id, newStatus),
    onMutate: async (newStatus) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["tasks"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["tasks"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((t: any) => 
            t.id === task.id ? { ...t, status: newStatus } : t
          )
        };
      });

      return { previousTasks };
    },
    onError: (err, newStatus, context) => {
      queryClient.setQueryData(["tasks"], context?.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const days = task.estimated_hours ? Math.floor(task.estimated_hours / 24) : 0;

  const getCardStyles = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 border-green-200 shadow-green-100/50";
      case "OVERDUE":
        return "bg-red-50 border-red-200 shadow-red-100/50";
      case "PENDING":
        return "bg-orange-50 border-orange-200 shadow-orange-100/50";
      case "IN_PROGRESS":
        return "bg-white border-slate-200 shadow-sm";
      default:
        return "bg-white border-slate-200 shadow-sm";
    }
  };
  
  return (
    <div key={task.id} className={`group rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${getCardStyles(task.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Portrait/Profile Photo */}
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
            {assignee?.profile_photo_url ? (
              <img src={assignee.profile_photo_url} alt={assignee.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-100 text-[14px] font-bold text-primary-700">
                {assignee?.full_name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {assignee?.full_name ?? "Unassigned"} 
            </h4>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {assignee?.department ?? "No Designation"}
            </p>
          </div>
        </div>

        <span className={`rounded-xl px-4 py-1 text-[10px] font-black uppercase tracking-wider border transform -translate-y-1 ${
          task.priority === 'CRITICAL' ? 'bg-red-600 text-white border-red-700 shadow-[0_4px_0_0_#991b1b]' :
          task.priority === 'HIGH' ? 'bg-amber-500 text-white border-amber-600 shadow-[0_4px_0_0_#d97706]' :
          task.priority === 'MEDIUM' ? 'bg-blue-500 text-white border-blue-600 shadow-[0_4px_0_0_#2563eb]' :
          'bg-slate-500 text-white border-slate-600 shadow-[0_4px_0_0_#475569]'
        }`}>
          {task.priority}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2 text-sm">
          <span className="font-bold text-slate-700">Task :</span>
          <span className="font-medium text-slate-600">{task.title}</span>
        </div>

        {task.description && (
          <div className="flex gap-2 text-sm">
            <span className="font-bold text-slate-700">Description :</span>
            <span className="font-medium text-slate-600">{task.description}</span>
          </div>
        )}
        
        <div className="flex gap-2 text-sm">
          <span className="font-bold text-slate-700">Doing the task from :</span>
          <span className="font-bold text-primary-600">{days} days</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100/50 pt-3 text-[11px]">
          <div className="flex gap-1">
            <span className="font-bold uppercase tracking-tight text-slate-400">Assigned Date:</span>
            <span className="font-bold text-slate-900">
              {task.start_date ? new Date(task.start_date).toLocaleDateString("en-IN") : "-"}
            </span>
          </div>
          <div className="mx-2 hidden h-3 w-px bg-slate-200 sm:block" />
          <div className="flex gap-1">
            <span className="font-bold uppercase tracking-tight text-slate-400">Deadline:</span>
            <span className="font-bold text-slate-900 underline decoration-red-200 underline-offset-2">
              {task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "-"}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100/50 pt-3">
        <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${
          task.status === "COMPLETED" ? "bg-green-500" :
          task.status === "OVERDUE" ? "bg-red-500" :
          task.status === "PENDING" ? "bg-orange-400" :
          "bg-slate-400"
        }`} />
        <div className="relative flex items-center">
          {isAdmin ? (
            <>
              <select
                value={task.status}
                onChange={(e) => mutation.mutate(e.target.value)}
                className="rounded-lg border-none bg-transparent py-0.5 pl-0 pr-6 text-[11px] font-bold uppercase tracking-wider text-slate-600 outline-none ring-0 transition hover:text-slate-900"
              >
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
              {mutation.isPending && (
                <Loader2 className="absolute -right-2 h-3 w-3 animate-spin text-slate-400" />
              )}
            </>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {task.status.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {isAdmin && (
          <div className="ml-auto flex items-center gap-1">
            <button 
              onClick={() => onEdit(task)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors"
              title="Edit Task"
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete Task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
