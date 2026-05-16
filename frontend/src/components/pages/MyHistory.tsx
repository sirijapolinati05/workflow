import { useQuery } from "@tanstack/react-query";

import { fetchAttendance } from "@/features/dashboard/api";

import { CollectionPage } from "./CollectionPage";

export function MyHistoryPage() {
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: fetchAttendance });

  return (
    <CollectionPage
      title="Attendance"
      subtitle="Presence, check-in history, and operational availability"
      items={(attendance.data ?? []) as any[]}
      render={(item: any) => (
        <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{item.status}</p>
          <p className="text-sm text-slate-500">{new Date(item.check_in_at).toLocaleString()}</p>
        </div>
      )}
    />
  );
}
