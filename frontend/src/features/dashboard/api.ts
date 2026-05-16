import { api } from "@/lib/api";

type CreateTaskPayload = {
  title: string;
  description?: string;
  assigned_to_id?: string;
  created_by_id: string;
  priority?: string;
  status?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  tags?: string[];
};

export async function fetchDashboardAnalytics() {
  const { data } = await api.get("/analytics/dashboard");
  return data;
}

export async function fetchUsers() {
  const { data } = await api.get("/users?page=1&page_size=100");
  return data;
}

export async function fetchTasks() {
  const { data } = await api.get("/tasks?page=1&page_size=20");
  return data;
}

export async function updateTask(taskId: string, payload: Partial<CreateTaskPayload>) {
  const { data } = await api.patch(`/tasks/${taskId}`, payload);
  return data;
}

export async function updateTaskStatus(taskId: string, status: string) {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: string) {
  const { data } = await api.delete(`/tasks/${taskId}`);
  return data;
}

export async function createTask(payload: CreateTaskPayload) {
  const { data } = await api.post("/tasks", payload);
  return data;
}

export async function fetchNotifications() {
  const { data } = await api.get("/notifications?page=1&page_size=10");
  return data;
}

export async function fetchGroups() {
  const { data } = await api.get("/groups?page=1&page_size=20");
  return data;
}

export async function createGroup(payload: { name: string; description?: string; owner_id: string; member_ids: string[] }) {
  const { data } = await api.post("/groups", payload);
  return data;
}

export async function fetchGroup(id: string) {
  const { data } = await api.get(`/groups/${id}`);
  return data;
}

export async function deleteGroup(id: string) {
  const { data } = await api.delete(`/groups/${id}`);
  return data;
}

export async function addGroupMembers(id: string, member_ids: string[]) {
  const { data } = await api.post(`/groups/${id}/members`, { member_ids });
  return data;
}

export async function exitGroup(id: string) {
  const { data } = await api.post(`/groups/${id}/exit`);
  return data;
}

export async function fetchSubmissions() {
  const { data } = await api.get("/submissions?page=1&page_size=20");
  return data;
}

export async function fetchReports() {
  const { data } = await api.get("/reports");
  return data;
}

export async function fetchAttendance() {
  const { data } = await api.get("/attendance");
  return data;
}

export async function updateSubmissionStatus(submissionId: string, status: string) {
  const { data } = await api.patch(`/submissions/${submissionId}`, { status });
  return data;
}

export async function createSubmission(payload: any) {
  const { data } = await api.post("/submissions", payload);
  return data;
}

export async function deleteSubmission(id: string) {
  const { data } = await api.delete(`/submissions/${id}`);
  return data;
}

export async function updateSubmission(id: string, payload: any) {
  const { data } = await api.patch(`/submissions/${id}`, payload);
  return data;
}

export async function markNotificationsAsReadByType(type: string | null = null) {
  const { data } = await api.post("/notifications/mark-read-by-type", { type });
  return data;
}
export async function addSubmissionFeedback(id: string, feedback: string, files: File[]) {
  const fd = new FormData();
  fd.append("feedback", feedback);
  files.forEach(file => fd.append("files", file));
  
  const { data } = await api.post(`/submissions/${id}/feedback`, fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function fetchInbox() {
  const { data } = await api.get("/mail/inbox");
  return data;
}

export async function fetchSent() {
  const { data } = await api.get("/mail/sent");
  return data;
}

export async function sendInternalMail(payload: { recipient_id: string; subject: string; body: string }) {
  const { data } = await api.post("/mail/send", payload);
  return data;
}

export async function markMailAsRead(id: string) {
  const { data } = await api.patch(`/mail/${id}/read`);
  return data;
}

export async function updateProfile(payload: any) {
  const { data } = await api.patch("/users/me", payload);
  return data;
}
