import { useQuery } from "@tanstack/react-query";

import { fetchReports } from "@/features/dashboard/api";

import { CollectionPage } from "./CollectionPage";

export function ReportsPage() {
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });

  return (
    <CollectionPage
      title="Reports"
      subtitle="Operational snapshots, analytics exports, and delivery summaries"
      items={(reports.data ?? []) as any[]}
      render={(report: any) => (
        <div key={report.id} className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{report.name}</p>
          <p className="text-sm text-slate-500">{report.report_type}</p>
        </div>
      )}
    />
  );
}
