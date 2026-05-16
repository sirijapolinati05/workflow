import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";

export function MetricCard({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="mt-4 flex items-end justify-between">
          <h3 className="text-4xl font-semibold text-slate-950">{value}</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

