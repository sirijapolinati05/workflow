import { LogOut, Search, Sparkles } from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  return (
    <header className="glass-panel sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] px-6 py-4">
      <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-500">
        <Search className="h-4 w-4" />
        <span className="truncate text-sm">Search people, tasks, messages</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
          <Sparkles className="mr-2 inline h-4 w-4" />
          Realtime Workspace
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{user?.full_name ?? "WorkFlow User"}</p>
          <p className="text-xs text-slate-500">{typeof user?.role === 'string' ? user.role : user?.role?.name ?? "Role"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
