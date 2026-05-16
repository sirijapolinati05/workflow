import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Briefcase, CheckCircle2, Clock, MessageSquare, AlertCircle, FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { fetchNotifications } from "@/features/dashboard/api";
import { CollectionPage } from "./CollectionPage";

export function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useQuery({ 
    queryKey: ["notifications"], 
    queryFn: fetchNotifications,
    refetchInterval: 10000 // Refetch every 10 seconds for pseudo-realtime
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={20} /></div>;
      case "SUBMISSION_RECEIVED":
        return <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><FileText size={20} /></div>;
      case "SUBMISSION_UPDATED":
        return <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>;
      case "TASK_UPDATED":
        return <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20} /></div>;
      case "GROUP_MESSAGE":
      case "GROUP_INVITE":
        return <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={20} /></div>;
      case "CHAT_MESSAGE":
        return <div className="p-2 bg-pink-50 text-pink-600 rounded-xl"><MessageSquare size={20} /></div>;
      case "NEW_USER":
        return <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl"><Bell size={20} /></div>;
      default:
        return <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Bell size={20} /></div>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.type?.startsWith("TASK_")) {
      navigate({ to: "/tasks" });
    } else if (notification.type?.startsWith("SUBMISSION_")) {
      navigate({ to: "/submissions" });
    } else if (notification.type?.startsWith("GROUP_")) {
      navigate({ to: "/groups" });
    } else if (notification.type === "CHAT_MESSAGE") {
      navigate({ to: "/chat" });
    } else if (notification.type === "NEW_USER") {
      navigate({ to: "/teams" });
    }
  };

  const filteredNotifications = useMemo(() => {
    const all = (notifications.data?.items ?? []) as any[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return all.filter(n => {
      // If it's a task notification with a deadline
      if (n.type?.startsWith("TASK_") && n.payload?.deadline) {
        const deadline = new Date(n.payload.deadline);
        deadline.setHours(23, 59, 59, 999);
        // Hide if current date has passed the deadline
        return today <= deadline;
      }
      // Show other notifications normally
      return true;
    });
  }, [notifications.data?.items]);

  return (
    <CollectionPage
      title="Notifications"
      subtitle="Stay updated with your latest tasks, submissions, and team alerts"
      items={filteredNotifications}
      render={(notification: any) => (
        <div className="mx-auto max-w-2xl w-full">
          <div 
            key={notification.id} 
            onClick={() => handleNotificationClick(notification)}
            className={`group relative flex items-start gap-4 rounded-[24px] border p-5 transition-all hover:shadow-md cursor-pointer ${
              notification.is_read ? 'bg-white border-slate-100 hover:border-primary-200' : 'bg-blue-50/30 border-blue-100 shadow-sm hover:border-blue-200'
            }`}
          >
            {getIcon(notification.type)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className={`text-sm font-bold truncate ${notification.is_read ? 'text-slate-800' : 'text-blue-900'}`}>
                  {notification.title}
                </h3>
                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  {getTimeAgo(notification.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={18} className="text-slate-300" />
            </div>
            
            {!notification.is_read && (
              <div className="absolute top-5 right-2 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </div>
        </div>
      )}
    />
  );
}
