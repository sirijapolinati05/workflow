import { PropsWithChildren } from "react";
import { View } from "react-native";

export function AppCard({ children }: PropsWithChildren) {
  return <View className="rounded-[28px] border border-white/70 bg-white p-5 shadow-sm">{children}</View>;
}

