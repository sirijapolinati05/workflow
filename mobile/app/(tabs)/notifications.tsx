import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchNotifications } from "@/features/notifications/api";

export default function NotificationsScreen() {
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  return (
    <Screen>
      <Heading title="Notifications" subtitle="Alerts, reminders, and status updates" />
      <View className="gap-4">
        {(notifications.data ?? []).map((notification: any) => (
          <AppCard key={notification.id}>
            <Text className="text-base font-semibold text-slate-950">{notification.title}</Text>
            <Text className="mt-2 text-sm text-slate-500">{notification.message}</Text>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}

