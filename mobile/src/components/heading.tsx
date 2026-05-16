import { Text, View } from "react-native";

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-1">
      <Text className="text-3xl font-bold text-slate-950">{title}</Text>
      {subtitle ? <Text className="text-sm text-slate-500">{subtitle}</Text> : null}
    </View>
  );
}

