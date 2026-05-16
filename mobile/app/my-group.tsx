import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppCard } from "@/components/card";
import { Heading } from "@/components/heading";
import { Screen } from "@/components/screen";
import { api } from "@/lib/api";

async function fetchGroups() {
  const { data } = await api.get("/groups?page=1&page_size=20");
  return data.items ?? [];
}

export default function MyGroupScreen() {
  const groups = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  return (
    <Screen>
      <Heading title="My Group" subtitle="View your project squads and collaboration rooms" />
      <View className="gap-4">
        {(groups.data ?? []).map((group: any) => (
          <AppCard key={group.id}>
            <Text className="text-base font-semibold text-slate-950">{group.name}</Text>
            <Text className="mt-2 text-sm text-slate-500">{group.description || "No description available."}</Text>
          </AppCard>
        ))}
      </View>
    </Screen>
  );
}

