import { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="gap-4">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

