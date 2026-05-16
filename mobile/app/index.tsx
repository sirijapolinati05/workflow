import { Redirect } from "expo-router";

import { useSessionStore } from "@/store/session-store";

export default function Index() {
  const token = useSessionStore((state) => state.tokens?.access_token);
  return <Redirect href={token ? "/(tabs)" : "/(auth)/login"} />;
}

