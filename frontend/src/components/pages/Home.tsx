import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { Card } from "@/components/ui/card";
import { fetchMessages } from "@/features/chat/api";
import { fetchDashboardAnalytics, fetchNotifications, fetchTasks, fetchUsers } from "@/features/dashboard/api";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuthStore } from "@/store/auth-store";

import { type DirectoryUser, PeopleSection, splitUsersByRole } from "./people-utils";

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const { events } = useRealtime(user?.id);
  const analytics = useQuery<{ metrics: { label: string; value: number; delta: number }[] }>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardAnalytics,
  });
  const users = useQuery<{ items: DirectoryUser[] }>({ queryKey: ["users"], queryFn: fetchUsers });
  const tasks = useQuery<{ items: any[] }>({ queryKey: ["tasks"], queryFn: fetchTasks });
  const messages = useQuery<{ items: any[] }>({ queryKey: ["messages"], queryFn: () => fetchMessages() });
  const notifications = useQuery<{ items: any[] }>({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const metrics = analytics.data?.metrics ?? [];
  const people = splitUsersByRole((users.data?.items ?? []) as DirectoryUser[]);

  return (
    <>
      <Card className="bg-gradient-to-br from-sky-50 via-white to-cyan-50">
        <p className="text-sm text-slate-500">WorkFlow Pro</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
          Hello, {user?.full_name?.split(" ")[0] ?? "Employee"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">Your workforce command center</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { label: "Mail Center", to: "/mail" },
            { label: "My Group", to: "/groups" },
            { label: "My History", to: "/attendance" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Assigned Tasks</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">{tasks.data?.items?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Unread Notifications</p>
          <p className="mt-3 text-4xl font-bold text-slate-950">
            {notifications.data?.items?.filter((n: any) => !n.is_read).length ?? 0}
          </p>
        </Card>
        {metrics.slice(0, 2).map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <ProductivityChart />
        <ActivityFeed events={events} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">People</h3>
          <div className="mt-4 space-y-6">
            <PeopleSection title="Admin" emptyLabel="No admins added yet." items={people.admins} />
            <PeopleSection title="Employees" emptyLabel="No employees added yet." items={people.employees} />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
          <div className="mt-4 space-y-3">
            {(tasks.data?.items ?? []).map((task: any) => (
              <div key={task.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{task.title}</p>
                  <span className="text-xs font-semibold text-primary-700">{task.priority}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{task.status}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Realtime Updates</h3>
          <div className="mt-4 space-y-3">
            {(messages.data?.items ?? []).slice(0, 4).map((message: any) => (
              <div key={message.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{message.body}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</p>
              </div>
            ))}
            {(notifications.data?.items ?? []).slice(0, 3).map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
