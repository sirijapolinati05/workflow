import { Card } from "@/components/ui/card";

export function ActivityFeed({ events }: { events: Array<{ type: string; [key: string]: unknown }> }) {
  return (
    <Card className="h-full">
      <h3 className="text-lg font-semibold text-slate-900">Realtime Activity</h3>
      <div className="mt-4 space-y-3">
        {events.length ? (
          events.map((event, index) => (
            <div key={`${event.type}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium capitalize text-slate-800">{event.type.replaceAll("_", " ")}</p>
              <pre className="mt-2 overflow-auto text-xs text-slate-500">{JSON.stringify(event, null, 2)}</pre>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Waiting for live team activity.
          </div>
        )}
      </div>
    </Card>
  );
}

