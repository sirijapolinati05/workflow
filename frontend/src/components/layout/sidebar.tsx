import { Link } from "@tanstack/react-router";
import { BarChart3, Bell, ClipboardList, FileText, FolderKanban, History, Mail, MessageSquareText, Settings, Users, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/features/dashboard/api";

import { useAuthStore } from "@/store/auth-store";

const adminItems = [
  { label: "Home", icon: BarChart3, to: "/" },
  { label: "People", icon: Users, to: "/teams" },
  { label: "Groups", icon: FolderKanban, to: "/groups" },
  { label: "Tasks", icon: ClipboardList, to: "/tasks" },
  { label: "Submissions", icon: FileText, to: "/submissions" },
  { label: "Reports", icon: FileText, to: "/reports" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Chat", icon: MessageSquareText, to: "/chat" },
  { label: "Mail Center", icon: Mail, to: "/mail" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const employeeItems = [
  { label: "Home", icon: BarChart3, to: "/" },
  { label: "People", icon: Users, to: "/teams" },
  { label: "My Group", icon: FolderKanban, to: "/groups" },
  { label: "My Tasks", icon: ClipboardList, to: "/tasks" },
  { label: "Submissions", icon: FileText, to: "/submissions" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "My History", icon: History, to: "/attendance" },
  { label: "Chat", icon: MessageSquareText, to: "/chat" },
  { label: "Mail Center", icon: Mail, to: "/mail" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isAdmin = roleName === "ADMIN" || roleName === "SUPER_ADMIN" || roleName === "TEAM_LEAD";
  const items = isAdmin ? adminItems : employeeItems;

  const notifications = useQuery({ 
    queryKey: ["notifications"], 
    queryFn: fetchNotifications,
    refetchInterval: 10000 
  });

  const getUnreadCount = (label: string) => {
    const allNotifications = (notifications.data?.items ?? []) as any[];
    const unread = allNotifications.filter(n => !n.is_read);
    
    if (label === "Tasks" || label === "My Tasks") {
      return unread.filter(n => n.type === "TASK_ASSIGNED" || n.type === "TASK_UPDATED").length;
    }
    if (label === "Groups" || label === "My Group") {
      return unread.filter(n => n.type === "GROUP_INVITE" || n.type === "GROUP_MESSAGE").length;
    }
    if (label === "Chat") {
      return unread.filter(n => n.type === "CHAT_MESSAGE").length;
    }
    if (label === "Submissions") {
      return unread.filter(n => n.type === "SUBMISSION_RECEIVED" || n.type === "SUBMISSION_UPDATED").length;
    }
    if (label === "People") {
      return unread.filter(n => n.type === "NEW_USER").length;
    }
    if (label === "Notifications") {
      return unread.length;
    }
    return 0;
  };

  return (
    <aside className="glass-panel sticky top-4 h-[calc(100vh-2rem)] rounded-[2rem] p-5">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-primary-600">WorkFlow Pro</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isAdmin ? "Admin" : "Workspace"}
        </h1>
        {isAdmin && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-600">
            <Shield className="h-3 w-3" />
            {roleName}
          </span>
        )}
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const count = getUnreadCount(item.label);
          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-primary-50 hover:text-primary-700"
              activeProps={{ className: "bg-primary-50 text-primary-700" }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              {count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-200 animate-in zoom-in duration-300">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
