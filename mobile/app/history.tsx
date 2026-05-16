import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchAttendance } from "@/features/attendance/api";

export default function HistoryScreen() {
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: fetchAttendance });
  return (
    <Screen>
      <Heading title="My History" subtitle="Attendance records and recent activity timeline" />
      <View className="gap-4">
        {(attendance.data ?? []).map((item: any) => (
          <AppCard key={item.id}>
            <Text className="text-base font-semibold text-slate-950">{item.status}</Text>
            <Text className="mt-2 text-sm text-slate-500">{new Date(item.check_in_at).toLocaleString()}</Text>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}

