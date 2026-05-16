import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatPage } from "@/components/pages/Chat";
import { HomePage } from "@/components/pages/Home";
import { LoginPage } from "@/components/pages/Login";
import { MailCenterPage } from "@/components/pages/MailCenter";
import { MyGroupPage } from "@/components/pages/MyGroup";
import { MyHistoryPage } from "@/components/pages/MyHistory";
import { MyTasksPage } from "@/components/pages/MyTasks";
import { NotificationsPage } from "@/components/pages/Notifications";
import { PeoplePage } from "@/components/pages/People";
import { ReportsPage } from "@/components/pages/Reports";
import { SettingsPage } from "@/components/pages/Settings";
import { SubmissionsPage } from "@/components/pages/Submissions";
import { useAuthStore } from "@/store/auth-store";

function ProtectedLayout() {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-12 gap-4 p-4">
      <div className="col-span-12 xl:col-span-2">
        <Sidebar />
      </div>
      <main className="col-span-12 space-y-4 xl:col-span-10">
        <Navbar />
        <Outlet />
      </main>
    </div>
  );
}

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: () => {
    if (!useAuthStore.getState().tokens) {
      throw redirect({ to: "/login" });
    }
  },
  component: ProtectedLayout,
});

const dashboardHomeRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: HomePage,
});

const teamsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "teams",
  component: PeoplePage,
});

const groupsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "groups",
  component: MyGroupPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "tasks",
  component: MyTasksPage,
});

const submissionsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "submissions",
  component: SubmissionsPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "reports",
  component: ReportsPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "notifications",
  component: NotificationsPage,
});

const attendanceRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "attendance",
  component: MyHistoryPage,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "chat",
  component: ChatPage,
});

const mailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "mail",
  component: MailCenterPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardHomeRoute,
    teamsRoute,
    groupsRoute,
    tasksRoute,
    submissionsRoute,
    reportsRoute,
    notificationsRoute,
    attendanceRoute,
    chatRoute,
    mailRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
