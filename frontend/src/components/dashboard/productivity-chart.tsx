import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";

const data = [
  { day: "Mon", output: 64 },
  { day: "Tue", output: 78 },
  { day: "Wed", output: 73 },
  { day: "Thu", output: 88 },
  { day: "Fri", output: 92 },
];

export function ProductivityChart() {
  return (
    <Card className="h-full">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">Productivity Trend</h3>
        <p className="text-sm text-slate-500">Weekly delivery throughput across active teams</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="day" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Line type="monotone" dataKey="output" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

