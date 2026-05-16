import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { fetchMyTasks } from "@/features/tasks/api";
import { markNotificationsAsReadByType } from "@/features/notifications/api";
import { useQueryClient } from "@tanstack/react-query";

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const tasks = useQuery({ queryKey: ["myTasks"], queryFn: fetchMyTasks });

  useFocusEffect(
    useCallback(() => {
      markNotificationsAsReadByType("TASK_ASSIGNED");
      markNotificationsAsReadByType("TASK_UPDATED");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, [])
  );

  return (
    <Screen>
      <Heading title="My Tasks" subtitle="Track progress, updates, and due dates" />
      <View className="gap-4">
        {(tasks.data ?? []).map((task: any) => (
          <AppCard key={task.id}>
            <Text className="text-lg font-semibold text-slate-950">{task.title}</Text>
            <Text className="mt-2 text-sm text-slate-500">{task.description || task.status}</Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{task.priority}</Text>
              <Pressable className="rounded-2xl bg-blue-600 px-4 py-3" onPress={() => router.push("/submissions/new")}>
                <Text className="font-semibold text-white">Submit Work</Text>
              </Pressable>
            </View>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}

