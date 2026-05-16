import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchMyTasks } from "@/features/tasks/api";
import { fetchNotifications } from "@/features/notifications/api";
import { useRealtime } from "@/hooks/use-realtime";
import { useSessionStore } from "@/store/session-store";

export default function DashboardScreen() {
  const user = useSessionStore((state) => state.user);
  const tasks = useQuery({ queryKey: ["myTasks"], queryFn: fetchMyTasks });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const events = useRealtime(user?.id);

  return (
    <Screen>
      <Heading title={`Hello, ${user?.full_name?.split(" ")[0] ?? "Employee"}`} subtitle="Your workforce command center" />
      <View className="gap-4">
        <AppCard>
          <Text className="text-sm text-slate-500">Assigned Tasks</Text>
          <Text className="mt-3 text-4xl font-bold text-slate-950">{tasks.data?.length ?? 0}</Text>
        </AppCard>
        <AppCard>
          <Text className="text-sm text-slate-500">Unread Notifications</Text>
          <Text className="mt-3 text-4xl font-bold text-slate-950">{notifications.data?.length ?? 0}</Text>
        </AppCard>
        <AppCard>
          <Text className="text-lg font-semibold text-slate-950">Realtime Updates</Text>
          <View className="mt-3 gap-3">
            {events.length ? (
              events.slice(0, 4).map((event, index) => (
                <View key={`${event.type}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                  <Text className="font-medium text-slate-900">{event.type}</Text>
                  <Text className="text-xs text-slate-500">{JSON.stringify(event)}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-slate-500">Waiting for live workspace events.</Text>
            )}
          </View>
        </AppCard>
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: "Mail Center", href: "/mail-center" },
            { label: "My Group", href: "/my-group" },
            { label: "My History", href: "/history" },
          ].map((link) => (
            <Pressable key={link.href} className="rounded-2xl bg-blue-600 px-4 py-3" onPress={() => router.push(link.href as never)}>
              <Text className="font-semibold text-white">{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
